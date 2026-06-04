import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { audit, getServices, requireUser, type SessionUser } from "./auth.js";
import { query } from "./db.js";

const taskParamsSchema = z.object({
  id: z.string().uuid()
});

const taskCreateSchema = z.object({
  title: z.string().trim().min(2).max(200),
  employeeId: z.string().uuid(),
  deadlineDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional()
});

const taskStatusSchema = z.object({
  status: z.enum(["open", "done"])
});

type TaskRow = {
  id: string;
  title: string;
  employee_id: string | null;
  employee_name: string | null;
  deadline_date: string | null;
  status: string;
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
};

export function registerTaskRoutes(app: FastifyInstance): void {
  app.get("/api/tasks", async (request, reply) => {
    const user = await requireTaskAccess(request, reply);
    if (!user) return;

    const canManage = canManageTasks(user);
    const [ownTasks, teamSummary, employees, teamTasks] = await Promise.all([
      getOwnTasks(user.id),
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
        INSERT INTO tasks (title, employee_id, deadline_date, status, created_by)
        VALUES ($1, $2, $3::date, 'open', $4)
        RETURNING id
      `,
      [parsed.data.title, parsed.data.employeeId, parsed.data.deadlineDate || null, user.id]
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
    if (!canManageTasks(user) && task.employee_id !== user.id) {
      await reply.code(403).send({ error: "forbidden" });
      return;
    }

    await query(
      `
        UPDATE tasks
        SET status = $2::task_status,
            updated_at = now()
        WHERE id = $1
      `,
      [params.data.id, parsed.data.status]
    );
    await audit(request, "task_status_update", user.id, "task", params.data.id, parsed.data);
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

async function getOwnTasks(employeeId: string): Promise<TaskRow[]> {
  const result = await query<TaskRow>(
    `
      SELECT
        t.id::text,
        t.title,
        t.employee_id,
        e.display_name AS employee_name,
        t.deadline_date::text,
        t.status::text,
        t.created_at::text,
        t.updated_at::text
      FROM tasks t
      LEFT JOIN employees e ON e.id = t.employee_id
      WHERE t.employee_id = $1
        AND t.status <> 'cancelled'
      ORDER BY
        CASE t.status WHEN 'open' THEN 1 WHEN 'done' THEN 2 ELSE 3 END,
        t.deadline_date NULLS LAST,
        t.created_at DESC
    `,
    [employeeId]
  );
  return result.rows;
}

async function getTeamTasks(): Promise<TaskRow[]> {
  const result = await query<TaskRow>(
    `
      SELECT
        t.id::text,
        t.title,
        t.employee_id,
        e.display_name AS employee_name,
        t.deadline_date::text,
        t.status::text,
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
        COUNT(*) FILTER (WHERE status = 'done' AND employee_id <> $1)::text AS done_by_others
      FROM tasks
    `,
    [employeeId]
  );
  return result.rows[0] || { total: "0", open_total: "0", done_total: "0", done_by_others: "0" };
}

async function getTaskOwner(id: string): Promise<{ employee_id: string | null } | undefined> {
  const result = await query<{ employee_id: string | null }>(
    "SELECT employee_id FROM tasks WHERE id = $1 AND status <> 'cancelled'",
    [id]
  );
  return result.rows[0];
}

function serializeTask(task: TaskRow) {
  return {
    id: task.id,
    title: task.title,
    employeeId: task.employee_id || "",
    employeeName: task.employee_name || "",
    deadlineDate: task.deadline_date || "",
    status: task.status,
    createdAt: task.created_at,
    updatedAt: task.updated_at
  };
}

function serializeTeamSummary(summary: TeamSummaryRow) {
  return {
    total: Number(summary.total || 0),
    open: Number(summary.open_total || 0),
    done: Number(summary.done_total || 0),
    doneByOthers: Number(summary.done_by_others || 0)
  };
}
