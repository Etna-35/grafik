import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { audit, getServices, requireUser, type SessionUser } from "./auth.js";
import { query } from "./db.js";
import { awardPoints, awardPointsToRole } from "./progress.js";
import { sendMessage, teamChatId, tgEscape } from "./telegram.js";

const taskParamsSchema = z.object({
  id: z.string().uuid()
});

const taskCreateSchema = z.object({
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().max(2000).nullable().optional(),
  employeeId: z.string().uuid().nullable().optional(),
  audienceRole: z.enum(["cook", "bar", "waiter", "dishwasher"]).nullable().optional(),
  deadlineDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  rewardAmount: z.number().int().min(0).max(1000000).nullable().optional()
}).refine((data) => Boolean(data.employeeId) !== Boolean(data.audienceRole), {
  message: "either employee or role"
});

const taskStatusSchema = z.object({
  status: z.enum(["open", "done"])
});

type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  employee_id: string | null;
  employee_name: string | null;
  audience_role: string | null;
  deadline_date: string | null;
  reward_amount: number | null;
  status: string;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
};

type EmployeeRow = {
  id: string;
  display_name: string;
  role: string;
};

type TeamSummaryRow = {
  total: string;
  open_total: string;
  done_total: string;
  done_by_others: string;
  awaiting_total: string;
};

export function registerTaskRoutes(app: FastifyInstance): void {
  app.get("/api/tasks", async (request, reply) => {
    const user = await requireTaskAccess(request, reply);
    if (!user) return;

    const canManage = canManageTasks(user);
    const [ownTasks, teamSummary, employees, teamTasks] = await Promise.all([
      getOwnTasks(user.id, user.role),
      getTeamSummary(user.id),
      canManage ? getTaskEmployees() : Promise.resolve([]),
      canManage ? getTeamTasks() : Promise.resolve([])
    ]);

    return {
      canManage,
      ownTasks: ownTasks.map(serializeTask),
      teamSummary: serializeTeamSummary(teamSummary),
      employees: employees.map((employee) => ({
        id: employee.id,
        name: employee.display_name,
        role: employee.role
      })),
      teamTasks: teamTasks.map(serializeTask)
    };
  });

  app.post("/api/tasks", async (request, reply) => {
    const user = await requireTaskManager(request, reply);
    if (!user) return;

    const parsed = taskCreateSchema.safeParse(request.body);
    if (!parsed.success) {
      await reply.code(400).send({ error: "bad_task" });
      return;
    }

    const result = await query<{ id: string }>(
      `
        INSERT INTO tasks (title, description, employee_id, audience_role, deadline_date, reward_amount, status, created_by)
        VALUES ($1, $2, $3, $4, $5::date, $6, 'open', $7)
        RETURNING id
      `,
      [parsed.data.title, parsed.data.description?.trim() || null, parsed.data.employeeId ?? null, parsed.data.audienceRole ?? null, parsed.data.deadlineDate || null, parsed.data.rewardAmount ?? null, user.id]
    );
    await audit(request, "task_create", user.id, "task", result.rows[0].id, parsed.data);
    return { ok: true, id: result.rows[0].id };
  });

  app.patch("/api/tasks/:id/status", async (request, reply) => {
    const user = await requireTaskAccess(request, reply);
    if (!user) return;

    const params = taskParamsSchema.safeParse(request.params);
    const parsed = taskStatusSchema.safeParse(request.body);
    if (!params.success || !parsed.success) {
      await reply.code(400).send({ error: "bad_task_status" });
      return;
    }

    const task = await getTaskOwner(params.data.id);
    if (!task) {
      await reply.code(404).send({ error: "not_found" });
      return;
    }
    const canTouch = canManageTasks(user)
      || task.employee_id === user.id
      || (task.audience_role !== null && task.audience_role === user.role);
    if (!canTouch) {
      await reply.code(403).send({ error: "forbidden" });
      return;
    }

    // Возврат личной задачи в работу снимает приёмку: убираем approved_at и начисленные очки.
    await query(
      `
        UPDATE tasks
        SET status = $2::task_status,
            approved_at = CASE WHEN $2 = 'open' THEN NULL ELSE approved_at END,
            updated_at = now()
        WHERE id = $1
      `,
      [params.data.id, parsed.data.status]
    );
    if (parsed.data.status === "open" && task.employee_id) {
      await query("DELETE FROM progress_events WHERE ref_type = 'task' AND ref_id = $1 AND kind = 'manager_task'", [params.data.id]);
    }
    await audit(request, "task_status_update", user.id, "task", params.data.id, parsed.data);
    // ЛИЧНАЯ задача: отметка «выполнено» = только заявка на приёмку. Очки/ТГ/премия — после одобрения (см. /approve).
    // РОЛЕВАЯ задача (вся смена): засчитывается сразу при «выполнено» (премии у неё нет).
    if (parsed.data.status === "done" && task.status !== "done" && !task.employee_id && task.audience_role) {
      await awardPointsToRole(task.audience_role, "role_task", "Задание смены выполнено", "task", params.data.id);
    }
    return { ok: true };
  });

  // Приёмка выполненной личной задачи руководителем: только теперь премия легитимна — очки + ТГ + учёт в доходе.
  app.patch("/api/tasks/:id/approve", async (request, reply) => {
    const user = await requireTaskManager(request, reply);
    if (!user) return;

    const params = taskParamsSchema.safeParse(request.params);
    if (!params.success) {
      await reply.code(400).send({ error: "bad_task" });
      return;
    }

    const task = await getTaskOwner(params.data.id);
    if (!task || !task.employee_id) {
      await reply.code(404).send({ error: "not_found" });
      return;
    }
    if (task.status !== "done") {
      await reply.code(409).send({ error: "not_done" });
      return;
    }
    if (task.approved_at) {
      return { ok: true, alreadyApproved: true };
    }

    await query("UPDATE tasks SET approved_at = now(), updated_at = now() WHERE id = $1", [params.data.id]);
    await awardPoints(task.employee_id, "manager_task", "Задание принято руководителем", "task", params.data.id);
    await audit(request, "task_approve", user.id, "task", params.data.id, { rewardAmount: task.reward_amount ?? null });

    if (teamChatId()) {
      const info = await query<{ name: string }>(
        "SELECT display_name AS name FROM employees WHERE id = $1",
        [task.employee_id]
      );
      const name = info.rows[0]?.name;
      if (name) {
        // Точную сумму в общий чат НЕ раскрываем — показываем «уровень» премии значками $
        // (видно, что за задачи платят деньги, но не сколько именно).
        const reward = task.reward_amount && task.reward_amount > 0
          ? `\nПремия ${rewardMask(task.reward_amount)} начислена 💰`
          : "";
        void sendMessage(teamChatId(), `✅ ${tgEscape(name)} выполнил личную задачу «${tgEscape(task.title)}»${reward}`).catch(() => {});
      }
    }
    return { ok: true };
  });

  app.delete("/api/tasks/:id", async (request, reply) => {
    const user = await requireTaskManager(request, reply);
    if (!user) return;

    const params = taskParamsSchema.safeParse(request.params);
    if (!params.success) {
      await reply.code(400).send({ error: "bad_task" });
      return;
    }

    await query(
      `
        UPDATE tasks
        SET status = 'cancelled',
            updated_at = now()
        WHERE id = $1
      `,
      [params.data.id]
    );
    await audit(request, "task_cancel", user.id, "task", params.data.id);
    return { ok: true };
  });
}

async function requireTaskAccess(request: FastifyRequest, reply: FastifyReply): Promise<SessionUser | undefined> {
  const user = await requireUser(request, reply);
  if (!user) return undefined;
  if (canManageTasks(user)) return user;

  const services = await getServices(user.id);
  if (!services.some((service) => service.code === "tasks" && service.can_view)) {
    await reply.code(403).send({ error: "forbidden" });
    return undefined;
  }
  return user;
}

async function requireTaskManager(request: FastifyRequest, reply: FastifyReply): Promise<SessionUser | undefined> {
  const user = await requireUser(request, reply);
  if (!user) return undefined;
  if (!canManageTasks(user)) {
    await reply.code(403).send({ error: "forbidden" });
    return undefined;
  }
  return user;
}

function canManageTasks(user: SessionUser): boolean {
  return user.role === "owner" || user.role === "manager";
}

// «Уровень» премии значками $ для общего чата — сумма скрыта, но видно, что платят деньги.
function rewardMask(amount: number): string {
  if (amount <= 1000) return "$$$";
  if (amount <= 3000) return "$$$$";
  return "$$$$$";
}

async function getOwnTasks(employeeId: string, role: string): Promise<TaskRow[]> {
  const result = await query<TaskRow>(
    `
      SELECT
        t.id::text,
        t.title,
        t.description,
        t.employee_id,
        e.display_name AS employee_name,
        t.audience_role,
        t.deadline_date::text,
        t.reward_amount,
        t.status::text,
        t.approved_at::text,
        t.created_at::text,
        t.updated_at::text
      FROM tasks t
      LEFT JOIN employees e ON e.id = t.employee_id
      WHERE (t.employee_id = $1 OR t.audience_role = $2)
        AND t.status <> 'cancelled'
      ORDER BY
        CASE t.status WHEN 'open' THEN 1 WHEN 'done' THEN 2 ELSE 3 END,
        t.deadline_date NULLS LAST,
        t.created_at DESC
    `,
    [employeeId, role]
  );
  return result.rows;
}

async function getTeamTasks(): Promise<TaskRow[]> {
  const result = await query<TaskRow>(
    `
      SELECT
        t.id::text,
        t.title,
        t.description,
        t.employee_id,
        e.display_name AS employee_name,
        t.audience_role,
        t.deadline_date::text,
        t.reward_amount,
        t.status::text,
        t.approved_at::text,
        t.created_at::text,
        t.updated_at::text
      FROM tasks t
      LEFT JOIN employees e ON e.id = t.employee_id
      WHERE t.status <> 'cancelled'
      ORDER BY
        CASE t.status WHEN 'open' THEN 1 WHEN 'done' THEN 2 ELSE 3 END,
        t.deadline_date NULLS LAST,
        t.created_at DESC
      LIMIT 200
    `
  );
  return result.rows;
}

async function getTaskEmployees(): Promise<EmployeeRow[]> {
  const result = await query<EmployeeRow>(
    `
      SELECT id, display_name, role::text
      FROM employees
      WHERE is_active = true
      ORDER BY
        CASE role
          WHEN 'owner' THEN 1
          WHEN 'manager' THEN 2
          WHEN 'cook' THEN 3
          WHEN 'bar' THEN 4
          WHEN 'waiter' THEN 5
          WHEN 'dishwasher' THEN 6
          ELSE 9
        END,
        display_name
    `
  );
  return result.rows;
}

async function getTeamSummary(employeeId: string): Promise<TeamSummaryRow> {
  const result = await query<TeamSummaryRow>(
    `
      SELECT
        COUNT(*) FILTER (WHERE status <> 'cancelled')::text AS total,
        COUNT(*) FILTER (WHERE status = 'open')::text AS open_total,
        COUNT(*) FILTER (WHERE status = 'done')::text AS done_total,
        COUNT(*) FILTER (WHERE status = 'done' AND employee_id <> $1)::text AS done_by_others,
        COUNT(*) FILTER (WHERE status = 'done' AND employee_id IS NOT NULL AND approved_at IS NULL)::text AS awaiting_total
      FROM tasks
    `,
    [employeeId]
  );
  return result.rows[0] || { total: "0", open_total: "0", done_total: "0", done_by_others: "0", awaiting_total: "0" };
}

async function getTaskOwner(id: string): Promise<{ employee_id: string | null; audience_role: string | null; status: string; approved_at: string | null; reward_amount: number | null; title: string } | undefined> {
  const result = await query<{ employee_id: string | null; audience_role: string | null; status: string; approved_at: string | null; reward_amount: number | null; title: string }>(
    "SELECT employee_id::text, audience_role, status, approved_at::text, reward_amount, title FROM tasks WHERE id = $1 AND status <> 'cancelled'",
    [id]
  );
  return result.rows[0];
}

function serializeTask(task: TaskRow) {
  return {
    id: task.id,
    title: task.title,
    description: task.description || "",
    employeeId: task.employee_id || "",
    employeeName: task.employee_name || "",
    audienceRole: task.audience_role || null,
    deadlineDate: task.deadline_date || "",
    rewardAmount: task.reward_amount ?? null,
    status: task.status,
    approvedAt: task.approved_at || null,
    // Личная задача, отмеченная выполненной, но ещё не принятая руководителем.
    awaitingApproval: Boolean(task.employee_id) && task.status === "done" && !task.approved_at,
    createdAt: task.created_at,
    updatedAt: task.updated_at
  };
}

function serializeTeamSummary(summary: TeamSummaryRow) {
  return {
    total: Number(summary.total || 0),
    open: Number(summary.open_total || 0),
    done: Number(summary.done_total || 0),
    doneByOthers: Number(summary.done_by_others || 0),
    awaiting: Number(summary.awaiting_total || 0)
  };
}
