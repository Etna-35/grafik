import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { audit, requireUser, type SessionUser } from "./auth.js";
import { query } from "./db.js";
import { isFeatureEnabled } from "./features.js";

// Чаевые: официант/бармен сам ведёт суммы по дням + ставит ЛИЧНУЮ цель на месяц.
// Суммы видит сотрудник И руководитель (под аналитику). Цель — приватная, только сотруднику.
// Чаевые НЕ являются обязательством ресторана: в «остаток к выплате»/ФОТ/P&L не попадают.

const TIPS_ROLES = ["waiter", "bar"];

const monthQuerySchema = z.object({
  year: z.coerce.number().int().min(2020).max(2100).optional(),
  month: z.coerce.number().int().min(1).max(12).optional()
});
const entrySchema = z.object({
  workDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amount: z.number().int().min(0).max(1000000)
});
const dateOnlySchema = z.object({ workDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) });
const goalSchema = z.object({
  year: z.coerce.number().int().min(2020).max(2100),
  month: z.coerce.number().int().min(1).max(12),
  amount: z.number().int().positive().max(10000000).nullable()
});

function isManager(user: SessionUser): boolean {
  return user.role === "owner" || user.role === "manager";
}

/** Чаевые доступны официантам и барменам (и руководителю — для просмотра команды). */
async function canUseTips(user: SessionUser): Promise<boolean> {
  if (isManager(user)) return true;
  const r = await query<{ role: string; schedule_role: string | null }>(
    "SELECT role::text, schedule_role FROM employees WHERE id = $1",
    [user.id]
  );
  const row = r.rows[0];
  if (!row) return false;
  return TIPS_ROLES.includes(row.role) || TIPS_ROLES.includes(row.schedule_role || "");
}

/** Сумма чаевых сотрудника за месяц — используется и в payroll (строка дохода). */
export async function getTipsTotalForMonth(employeeId: string, start: string): Promise<number> {
  if (!(await isFeatureEnabled("tips"))) return 0;
  const r = await query<{ total: string }>(
    `SELECT COALESCE(SUM(amount), 0)::text AS total FROM employee_tips
     WHERE employee_id = $1 AND work_date >= $2::date AND work_date < ($2::date + interval '1 month')`,
    [employeeId, start]
  );
  return Number(r.rows[0]?.total || 0);
}

async function getMonthData(user: SessionUser, year: number, month: number) {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const prevDate = new Date(Date.UTC(year, month - 2, 1));
  const prevStart = `${prevDate.getUTCFullYear()}-${String(prevDate.getUTCMonth() + 1).padStart(2, "0")}-01`;

  const [entries, goalRow, shiftStats, prevTotal] = await Promise.all([
    query<{ work_date: string; amount: number }>(
      `SELECT work_date::text, amount FROM employee_tips
       WHERE employee_id = $1 AND work_date >= $2::date AND work_date < ($2::date + interval '1 month')
       ORDER BY work_date DESC`,
      [user.id, start]
    ),
    query<{ amount: number }>(
      "SELECT amount FROM employee_tip_goals WHERE employee_id = $1 AND period_month = $2::date",
      [user.id, start]
    ),
    // Смены месяца из графика: всего, отработано (по сегодня), осталось впереди.
    query<{ total: string; worked: string; remaining: string }>(
      `SELECT COUNT(*)::text AS total,
              COUNT(*) FILTER (WHERE work_date <= (now() AT TIME ZONE 'Europe/Moscow')::date)::text AS worked,
              COUNT(*) FILTER (WHERE work_date > (now() AT TIME ZONE 'Europe/Moscow')::date)::text AS remaining
       FROM schedule_shifts
       WHERE employee_id = $1 AND work_date >= $2::date AND work_date < ($2::date + interval '1 month')`,
      [user.id, start]
    ),
    query<{ total: string }>(
      `SELECT COALESCE(SUM(amount), 0)::text AS total FROM employee_tips
       WHERE employee_id = $1 AND work_date >= $2::date AND work_date < ($2::date + interval '1 month')`,
      [user.id, prevStart]
    )
  ]);

  const collected = entries.rows.reduce((s, r) => s + Number(r.amount || 0), 0);
  const goal = goalRow.rows[0]?.amount ?? null;
  const shiftsTotal = Number(shiftStats.rows[0]?.total || 0);
  const shiftsWorked = Number(shiftStats.rows[0]?.worked || 0);
  const shiftsRemaining = Number(shiftStats.rows[0]?.remaining || 0);
  const left = goal != null ? Math.max(0, goal - collected) : 0;

  return {
    year,
    month,
    collected,
    goal,
    goalReached: goal != null && collected >= goal,
    progressPct: goal && goal > 0 ? Math.min(100, Math.round((collected / goal) * 100)) : 0,
    left,
    shiftsTotal,
    shiftsWorked,
    shiftsRemaining,
    // Сколько нужно в среднем за оставшуюся смену, чтобы дойти до цели.
    avgNeeded: goal != null && left > 0 && shiftsRemaining > 0 ? Math.round(left / shiftsRemaining) : null,
    // Фактический средний чай за отработанную смену.
    avgPerShift: shiftsWorked > 0 ? Math.round(collected / shiftsWorked) : 0,
    prevMonthTotal: Number(prevTotal.rows[0]?.total || 0),
    entries: entries.rows.map((r) => ({ workDate: r.work_date, amount: Number(r.amount) }))
  };
}

export function registerTipsRoutes(app: FastifyInstance): void {
  app.get("/api/tips", async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await requireUser(request, reply);
    if (!user) return;
    if (!(await isFeatureEnabled("tips"))) return { enabled: false };
    if (!(await canUseTips(user))) return { enabled: false };

    const parsed = monthQuerySchema.safeParse(request.query);
    const now = new Date();
    const year = parsed.success && parsed.data.year ? parsed.data.year : now.getFullYear();
    const month = parsed.success && parsed.data.month ? parsed.data.month : now.getMonth() + 1;

    const own = await getMonthData(user, year, month);

    // Руководителю — суммы команды (БЕЗ личных целей: они приватные).
    let team: Array<{ id: string; name: string; total: number; entries: number; avgPerShift: number }> | undefined;
    if (isManager(user)) {
      const start = `${year}-${String(month).padStart(2, "0")}-01`;
      const rows = await query<{ id: string; name: string; total: string; cnt: string; shifts: string }>(
        `SELECT e.id::text, e.display_name AS name,
                COALESCE(SUM(t.amount), 0)::text AS total,
                COUNT(t.id)::text AS cnt,
                (SELECT COUNT(*) FROM schedule_shifts s
                  WHERE s.employee_id = e.id AND s.work_date >= $1::date
                    AND s.work_date < ($1::date + interval '1 month')
                    AND s.work_date <= (now() AT TIME ZONE 'Europe/Moscow')::date)::text AS shifts
         FROM employees e
         LEFT JOIN employee_tips t ON t.employee_id = e.id
           AND t.work_date >= $1::date AND t.work_date < ($1::date + interval '1 month')
         WHERE e.is_active = true AND e.archived_at IS NULL
           AND (e.role::text = ANY($2::text[]) OR COALESCE(e.schedule_role,'') = ANY($2::text[]))
         GROUP BY e.id, e.display_name
         ORDER BY COALESCE(SUM(t.amount), 0) DESC, e.display_name`,
        [start, TIPS_ROLES]
      );
      team = rows.rows.map((r) => {
        const total = Number(r.total || 0);
        const shifts = Number(r.shifts || 0);
        return {
          id: r.id,
          name: r.name,
          total,
          entries: Number(r.cnt || 0),
          avgPerShift: shifts > 0 ? Math.round(total / shifts) : 0
        };
      });
    }

    return { enabled: true, canManage: isManager(user), ...own, team };
  });

  // Внести/изменить чаевые за день — ТОЛЬКО свои.
  app.put("/api/tips", async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await requireUser(request, reply);
    if (!user) return;
    if (!(await isFeatureEnabled("tips")) || !(await canUseTips(user))) {
      await reply.code(403).send({ error: "forbidden" });
      return;
    }
    const parsed = entrySchema.safeParse(request.body);
    if (!parsed.success) {
      await reply.code(400).send({ error: "bad_tips" });
      return;
    }
    await query(
      `INSERT INTO employee_tips (employee_id, work_date, amount) VALUES ($1, $2::date, $3)
       ON CONFLICT (employee_id, work_date) DO UPDATE SET amount = excluded.amount, updated_at = now()`,
      [user.id, parsed.data.workDate, parsed.data.amount]
    );
    await audit(request, "tips_set", user.id, "tips", parsed.data.workDate, { amount: parsed.data.amount });
    return { ok: true };
  });

  app.delete("/api/tips", async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await requireUser(request, reply);
    if (!user) return;
    const parsed = dateOnlySchema.safeParse(request.body);
    if (!parsed.success) {
      await reply.code(400).send({ error: "bad_tips" });
      return;
    }
    await query("DELETE FROM employee_tips WHERE employee_id = $1 AND work_date = $2::date", [user.id, parsed.data.workDate]);
    await audit(request, "tips_delete", user.id, "tips", parsed.data.workDate);
    return { ok: true };
  });

  // Личная цель на месяц (amount=null — снять). Приватно: только свою.
  app.put("/api/tips/goal", async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await requireUser(request, reply);
    if (!user) return;
    if (!(await isFeatureEnabled("tips")) || !(await canUseTips(user))) {
      await reply.code(403).send({ error: "forbidden" });
      return;
    }
    const parsed = goalSchema.safeParse(request.body);
    if (!parsed.success) {
      await reply.code(400).send({ error: "bad_goal" });
      return;
    }
    const start = `${parsed.data.year}-${String(parsed.data.month).padStart(2, "0")}-01`;
    if (parsed.data.amount == null) {
      await query("DELETE FROM employee_tip_goals WHERE employee_id = $1 AND period_month = $2::date", [user.id, start]);
    } else {
      await query(
        `INSERT INTO employee_tip_goals (employee_id, period_month, amount) VALUES ($1, $2::date, $3)
         ON CONFLICT (employee_id, period_month) DO UPDATE SET amount = excluded.amount, updated_at = now()`,
        [user.id, start, parsed.data.amount]
      );
    }
    await audit(request, "tips_goal_set", user.id, "tips_goal", start, { amount: parsed.data.amount });
    return { ok: true };
  });
}
