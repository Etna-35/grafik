import path from "node:path";
import { fileURLToPath } from "node:url";
import cookie from "@fastify/cookie";
import fastifyStatic from "@fastify/static";
import Fastify from "fastify";
import { z } from "zod";
import {
  assertLoginAllowed,
  audit,
  authenticateRequest,
  clearFailedLogins,
  createSession,
  deleteExpiredSessions,
  destroySession,
  findEmployeeByPin,
  getServices,
  recordFailedLogin,
  requireUser
} from "./auth.js";
import { env } from "./env.js";
import { pool, query } from "./db.js";
import { registerAdminRoutes } from "./admin.js";
import { registerScheduleRoutes } from "./schedule.js";
import { registerShiftClosingRoutes } from "./shiftClosing.js";
import { registerPayrollRoutes } from "./payroll.js";
import { registerRequisitionRoutes } from "./requisitions.js";
import { registerTaskRoutes } from "./tasks.js";
import { registerTrainingRoutes } from "./training.js";
import { registerHandoverRoutes } from "./handovers.js";
import { registerPraiseRoutes } from "./praises.js";
import { registerSalesGoalRoutes } from "./salesGoals.js";
import { registerProgressRoutes, getProgressSummary } from "./progress.js";
import { registerQuizRoutes } from "./quiz.js";
import { registerFinanceRoutes } from "./finance.js";
import { startCron } from "./cron.js";

const pinSchema = z.object({
  pin: z.string().regex(/^\d{4,8}$/)
});

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const publicDir = path.join(rootDir, "apps/web");

export function buildServer() {
  const app = Fastify({
    logger: true,
    trustProxy: true,
    bodyLimit: 16 * 1024 * 1024
  });

  app.register(cookie);

  app.get("/health", async () => ({ ok: true }));

  app.get("/api/health", async () => {
    await query("SELECT 1");
    return { ok: true };
  });

  app.post("/api/auth/pin", async (request, reply) => {
    const parsed = pinSchema.safeParse(request.body);
    if (!parsed.success) {
      await reply.code(400).send({ error: "bad_pin" });
      return;
    }

    if (!(await assertLoginAllowed(request))) {
      await reply.code(429).send({ error: "too_many_attempts" });
      return;
    }

    const employee = await findEmployeeByPin(parsed.data.pin);
    if (!employee) {
      await recordFailureWithDelay(request);
      await reply.code(401).send({ error: "invalid_pin" });
      return;
    }

    await clearFailedLogins(request);
    await createSession(request, reply, employee.id);
    await audit(request, "login_success", employee.id, "employee", employee.id);

    const services = await getServices(employee.id);
    return {
      user: {
        id: employee.id,
        displayName: employee.display_name,
        role: employee.role
      },
      services
    };
  });

  app.post("/api/auth/logout", async (request, reply) => {
    const user = await authenticateRequest(request);
    await destroySession(request, reply);
    if (user) {
      await audit(request, "logout", user.id, "employee", user.id);
    }
    return { ok: true };
  });

  app.get("/api/me", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return;

    const services = await getServices(user.id);
    return {
      user: {
        id: user.id,
        displayName: user.display_name,
        role: user.role
      },
      services
    };
  });

  app.get("/api/services", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return;
    return { services: await getServices(user.id) };
  });

  app.get("/api/summary", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return;

    const manager = user.role === "owner" || user.role === "manager";
    const result = await query<{
      paid_total: string;
      tasks_open: string;
      tasks_done: string;
      tasks_total: string;
      shifts_count: string;
      handover_count: string;
      day_fot: string;
      start_date: string | null;
      praises_received: string;
      scores_total: string;
      scores_good: string;
      scores_mid: string;
      scores_bad: string;
      dow: number;
    }>(
      `
        SELECT
          COALESCE((SELECT SUM(amount) FROM payroll_payouts WHERE employee_id = $1), 0)::text AS paid_total,
          COALESCE((SELECT COUNT(*) FROM tasks WHERE employee_id = $1 AND status = 'open'), 0)::text AS tasks_open,
          COALESCE((SELECT COUNT(*) FROM tasks WHERE employee_id = $1 AND status = 'done'
            AND created_at >= date_trunc('month', now() AT TIME ZONE 'Europe/Moscow')), 0)::text AS tasks_done,
          COALESCE((SELECT COUNT(*) FROM tasks WHERE employee_id = $1 AND status <> 'cancelled'
            AND created_at >= date_trunc('month', now() AT TIME ZONE 'Europe/Moscow')), 0)::text AS tasks_total,
          COALESCE((SELECT COUNT(*) FROM schedule_shifts WHERE employee_id = $1), 0)::text AS shifts_count,
          COALESCE((
            SELECT COUNT(*) FROM shift_handovers h
            WHERE h.resolved = false
              AND ($2 = true OR h.audience = 'all' OR h.audience = $3 OR h.author_id = $1)
          ), 0)::text AS handover_count,
          COALESCE((SELECT SUM(pay_amount) FROM schedule_shifts
            WHERE work_date = (now() AT TIME ZONE 'Europe/Moscow')::date), 0)::text AS day_fot,
          (SELECT start_date::text FROM employees WHERE id = $1) AS start_date,
          COALESCE((SELECT COUNT(*) FROM praises WHERE to_id = $1), 0)::text AS praises_received,
          COALESCE((SELECT COUNT(*) FROM employee_scores WHERE employee_id = $1), 0)::text AS scores_total,
          COALESCE((SELECT COUNT(*) FROM employee_scores WHERE employee_id = $1 AND score = 'green'), 0)::text AS scores_good,
          COALESCE((SELECT COUNT(*) FROM employee_scores WHERE employee_id = $1 AND score = 'yellow'), 0)::text AS scores_mid,
          COALESCE((SELECT COUNT(*) FROM employee_scores WHERE employee_id = $1 AND score = 'red'), 0)::text AS scores_bad,
          EXTRACT(DOW FROM (now() AT TIME ZONE 'Europe/Moscow')::date)::int AS dow
      `,
      [user.id, manager, user.role]
    );

    const dayFot = Number(result.rows[0].day_fot);
    // План выручки: будни ×0.8, ПТ(5)/СБ(6) ×1.5 от табличного (ФОТ/0.23).
    const revenueMult = result.rows[0].dow === 5 || result.rows[0].dow === 6 ? 1.5 : 0.8;

    const goals = await query<{
      id: string;
      title: string;
      target_qty: number;
      current_qty: number;
      reward_amount: number | null;
      status: string;
    }>(
      `
        SELECT id::text, title, target_qty, current_qty, reward_amount, status
        FROM sales_goals
        WHERE employee_id = $1 AND status IN ('active', 'reached')
        ORDER BY created_at DESC
      `,
      [user.id]
    );

    const progress = await getProgressSummary(user.id, result.rows[0].start_date);

    // Дни рождения: своё (личное поздравление) и коллег (предложить сказать «Спасибо»).
    const birthdays = await query<{ id: string; display_name: string; is_self: boolean }>(
      `
        SELECT id, display_name, (id = $1) AS is_self
        FROM employees
        WHERE is_active = true AND archived_at IS NULL AND birth_date IS NOT NULL
          AND to_char(birth_date, 'MM-DD') = to_char((now() AT TIME ZONE 'Europe/Moscow')::date, 'MM-DD')
        ORDER BY display_name
      `,
      [user.id]
    );

    return {
      isBirthdayToday: birthdays.rows.some((row) => row.is_self),
      birthdaysToday: birthdays.rows.filter((row) => !row.is_self).map((row) => ({ id: row.id, name: row.display_name })),
      level: progress.level,
      progressPct: progress.progressPct,
      toNextPct: progress.toNextPct,
      pointsTotal: progress.pointsTotal,
      salesGoals: goals.rows.map((g) => ({
        id: g.id,
        title: g.title,
        target: g.target_qty,
        current: g.current_qty,
        rewardAmount: g.reward_amount ?? null,
        status: g.status,
        reached: g.current_qty >= g.target_qty
      })),
      startDate: result.rows[0].start_date,
      paidTotal: Number(result.rows[0].paid_total),
      tasksOpen: Number(result.rows[0].tasks_open),
      tasksDone: Number(result.rows[0].tasks_done),
      tasksTotal: Number(result.rows[0].tasks_total),
      shiftsCount: Number(result.rows[0].shifts_count),
      handoverCount: Number(result.rows[0].handover_count),
      cashPlanToday: dayFot,
      revenuePlanToday: dayFot > 0 ? Math.round((dayFot / 0.23) * revenueMult) : 0,
      praisesReceived: Number(result.rows[0].praises_received),
      scoresTotal: Number(result.rows[0].scores_total),
      scoresGood: Number(result.rows[0].scores_good),
      scoresMid: Number(result.rows[0].scores_mid),
      scoresBad: Number(result.rows[0].scores_bad)
    };
  });

  registerScheduleRoutes(app);
  registerAdminRoutes(app);
  registerShiftClosingRoutes(app);
  registerPayrollRoutes(app);
  registerTaskRoutes(app);
  registerRequisitionRoutes(app);
  registerTrainingRoutes(app);
  registerHandoverRoutes(app);
  registerPraiseRoutes(app);
  registerSalesGoalRoutes(app);
  registerProgressRoutes(app);
  registerQuizRoutes(app);
  registerFinanceRoutes(app);

  app.register(fastifyStatic, {
    root: publicDir,
    prefix: "/",
    wildcard: false
  });

  app.setNotFoundHandler(async (request, reply) => {
    if (request.url.startsWith("/api/")) {
      await reply.code(404).send({ error: "not_found" });
      return;
    }
    await reply.sendFile("index.html");
  });

  return app;
}

async function recordFailureWithDelay(request: Parameters<typeof audit>[0]): Promise<void> {
  await recordFailedLogin(request);
  await new Promise((resolve) => setTimeout(resolve, 350));
  await audit(request, "login_failed");
}

async function main(): Promise<void> {
  await deleteExpiredSessions();
  const app = buildServer();
  await app.listen({ host: "0.0.0.0", port: env.port });
  startCron();
}

main().catch(async (error) => {
  console.error(error);
  await pool.end();
  process.exit(1);
});
