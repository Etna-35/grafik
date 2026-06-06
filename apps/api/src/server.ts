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
      shifts_count: string;
      handover_count: string;
    }>(
      `
        SELECT
          COALESCE((SELECT SUM(amount) FROM payroll_payouts WHERE employee_id = $1), 0)::text AS paid_total,
          COALESCE((SELECT COUNT(*) FROM tasks WHERE employee_id = $1 AND status = 'open'), 0)::text AS tasks_open,
          COALESCE((SELECT COUNT(*) FROM schedule_shifts WHERE employee_id = $1), 0)::text AS shifts_count,
          COALESCE((
            SELECT COUNT(*) FROM shift_handovers h
            WHERE h.resolved = false
              AND ($2 = true OR h.audience = 'all' OR h.audience = $3 OR h.author_id = $1)
          ), 0)::text AS handover_count
      `,
      [user.id, manager, user.role]
    );

    return {
      paidTotal: Number(result.rows[0].paid_total),
      tasksOpen: Number(result.rows[0].tasks_open),
      shiftsCount: Number(result.rows[0].shifts_count),
      handoverCount: Number(result.rows[0].handover_count)
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
}

main().catch(async (error) => {
  console.error(error);
  await pool.end();
  process.exit(1);
});
