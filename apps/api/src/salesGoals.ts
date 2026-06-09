import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { audit, requireUser, type SessionUser } from "./auth.js";
import { query } from "./db.js";
import { sendMessage, teamChatId, tgEscape } from "./telegram.js";
import { awardPoints } from "./progress.js";

const createSchema = z.object({
  employeeId: z.string().uuid(),
  title: z.string().trim().min(2).max(120),
  targetQty: z.number().int().min(1).max(100000),
  rewardAmount: z.number().int().min(0).max(1000000).nullable().optional()
});

const progressSchema = z.object({
  delta: z.number().int().min(-1000).max(1000)
});

const paramsSchema = z.object({
  id: z.string().uuid()
});

type GoalRow = {
  id: string;
  employee_id: string;
  employee_name: string | null;
  title: string;
  target_qty: number;
  current_qty: number;
  reward_amount: number | null;
  status: string;
  work_date: string;
};

function isManager(user: SessionUser): boolean {
  return user.role === "owner" || user.role === "manager";
}

function serialize(row: GoalRow, userId: string) {
  return {
    id: row.id,
    employeeId: row.employee_id,
    employeeName: row.employee_name || "",
    title: row.title,
    target: row.target_qty,
    current: row.current_qty,
    rewardAmount: row.reward_amount ?? null,
    status: row.status,
    workDate: row.work_date,
    mine: row.employee_id === userId,
    reached: row.current_qty >= row.target_qty
  };
}

export function registerSalesGoalRoutes(app: FastifyInstance): void {
  app.get("/api/sales-goals", async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await requireUser(request, reply);
    if (!user) return;
    const manager = isManager(user);

    const goalsResult = await query<GoalRow>(
      `
        SELECT
          g.id::text,
          g.employee_id::text,
          e.display_name AS employee_name,
          g.title,
          g.target_qty,
          g.current_qty,
          g.reward_amount,
          g.status,
          g.work_date::text
        FROM sales_goals g
        LEFT JOIN employees e ON e.id = g.employee_id
        WHERE g.status IN ('active', 'reached')
          AND ($2 = true OR g.employee_id = $1)
        ORDER BY g.created_at DESC
        LIMIT 100
      `,
      [user.id, manager]
    );

    let employees: { id: string; name: string }[] = [];
    if (manager) {
      const empResult = await query<{ id: string; display_name: string }>(
        `
          SELECT id::text, display_name
          FROM employees
          WHERE is_active = true AND archived_at IS NULL
            AND role IN ('waiter', 'bar', 'cook')
          ORDER BY display_name
        `
      );
      employees = empResult.rows.map((row) => ({ id: row.id, name: row.display_name }));
    }

    return {
      canManage: manager,
      employees,
      goals: goalsResult.rows.map((row) => serialize(row, user.id))
    };
  });

  app.post("/api/sales-goals", async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await requireUser(request, reply);
    if (!user) return;
    if (!isManager(user)) {
      await reply.code(403).send({ error: "forbidden" });
      return;
    }
    const parsed = createSchema.safeParse(request.body);
    if (!parsed.success) {
      await reply.code(400).send({ error: "bad_goal" });
      return;
    }
    const result = await query<{ id: string }>(
      `
        INSERT INTO sales_goals (employee_id, title, target_qty, reward_amount, created_by)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `,
      [parsed.data.employeeId, parsed.data.title, parsed.data.targetQty, parsed.data.rewardAmount ?? null, user.id]
    );
    await audit(request, "sales_goal_create", user.id, "sales_goal", result.rows[0].id, parsed.data);
    return { ok: true, id: result.rows[0].id };
  });

  app.patch("/api/sales-goals/:id/progress", async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await requireUser(request, reply);
    if (!user) return;
    const params = paramsSchema.safeParse(request.params);
    const parsed = progressSchema.safeParse(request.body);
    if (!params.success || !parsed.success) {
      await reply.code(400).send({ error: "bad_goal" });
      return;
    }
    const goal = await query<{ employee_id: string; status: string }>(
      "SELECT employee_id::text, status FROM sales_goals WHERE id = $1",
      [params.data.id]
    );
    if (!goal.rows[0]) {
      await reply.code(404).send({ error: "not_found" });
      return;
    }
    if (!isManager(user) && goal.rows[0].employee_id !== user.id) {
      await reply.code(403).send({ error: "forbidden" });
      return;
    }
    if (goal.rows[0].status === "confirmed" || goal.rows[0].status === "cancelled") {
      await reply.code(409).send({ error: "goal_closed" });
      return;
    }
    await query(
      `
        UPDATE sales_goals
        SET current_qty = GREATEST(0, current_qty + $2),
            status = CASE
              WHEN GREATEST(0, current_qty + $2) >= target_qty THEN 'reached'
              ELSE 'active'
            END
        WHERE id = $1
      `,
      [params.data.id, parsed.data.delta]
    );
    if (goal.rows[0].status !== "reached") {
      const after = await query<{ status: string; name: string }>(
        `SELECT g.status, e.display_name AS name FROM sales_goals g JOIN employees e ON e.id = g.employee_id WHERE g.id = $1`,
        [params.data.id]
      );
      const row = after.rows[0];
      if (row && row.status === "reached") {
        await awardPoints(goal.rows[0].employee_id, "sales_goal", "Достиг цели по продажам", "sales_goal", params.data.id);
        if (teamChatId()) {
          void sendMessage(teamChatId(), `🎯 ${tgEscape(row.name)} выполнил план по продажам!`).catch(() => {});
        }
      }
    }
    return { ok: true };
  });

  app.patch("/api/sales-goals/:id/confirm", async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await requireUser(request, reply);
    if (!user) return;
    if (!isManager(user)) {
      await reply.code(403).send({ error: "forbidden" });
      return;
    }
    const params = paramsSchema.safeParse(request.params);
    if (!params.success) {
      await reply.code(400).send({ error: "bad_goal" });
      return;
    }
    await query(
      "UPDATE sales_goals SET status = 'confirmed', confirmed_at = now() WHERE id = $1 AND status <> 'cancelled'",
      [params.data.id]
    );
    await audit(request, "sales_goal_confirm", user.id, "sales_goal", params.data.id, {});
    return { ok: true };
  });

  app.delete("/api/sales-goals/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await requireUser(request, reply);
    if (!user) return;
    if (!isManager(user)) {
      await reply.code(403).send({ error: "forbidden" });
      return;
    }
    const params = paramsSchema.safeParse(request.params);
    if (!params.success) {
      await reply.code(400).send({ error: "bad_goal" });
      return;
    }
    await query("UPDATE sales_goals SET status = 'cancelled' WHERE id = $1", [params.data.id]);
    await audit(request, "sales_goal_cancel", user.id, "sales_goal", params.data.id, {});
    return { ok: true };
  });
}
