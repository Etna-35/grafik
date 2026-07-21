import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { requireUser, type SessionUser } from "./auth.js";
import { query } from "./db.js";
import { streakRewardsForMonth } from "./cashPlan.js";

const payrollQuerySchema = z.object({
  year: z.coerce.number().int().min(2020).max(2100).optional(),
  month: z.coerce.number().int().min(1).max(12).optional()
});

const obligationCreateSchema = z.object({
  employeeId: z.string().uuid(),
  title: z.string().trim().min(1).max(120),
  amountTotal: z.coerce.number().int().min(1).max(100_000_000),
  note: z.string().trim().max(300).optional().default("")
});

const obligationPaySchema = z.object({
  amount: z.coerce.number().int().min(1).max(100_000_000)
});

const obligationPatchSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  amountTotal: z.coerce.number().int().min(1).max(100_000_000).optional(),
  note: z.string().trim().max(300).optional()
});

const idParamSchema = z.object({ id: z.string().uuid() });

type ObligationRow = {
  id: string;
  title: string;
  amount_total: number;
  amount_paid: number;
  note: string | null;
  updated_at: string;
};

type ManageObligationRow = ObligationRow & {
  employee_id: string;
  employee_name: string;
};

type ShiftRow = {
  work_date: string;
  planned_hours: string | null;
  pay_amount: number | null;
  pay_model: string | null;
};

type PayoutRow = {
  id: string;
  work_date: string;
  amount: number;
  created_at: string;
  apply_month: string | null;
  obligation_title: string | null;
};

type PaydayRow = {
  work_date: string;
};

type HookahRow = {
  id: string;
  work_date: string;
  hookah_count: number;
  hookah_rate: number;
  hookah_payout: number;
};

type EmployeePayrollFlagsRow = {
  is_hookah_master: boolean;
};

type TaskRewardRow = {
  id: string;
  title: string;
  reward_amount: number;
  updated_at: string;
};

type GoalRewardRow = {
  id: string;
  title: string;
  reward_amount: number;
  confirmed_at: string;
};

export function registerPayrollRoutes(app: FastifyInstance): void {
  app.get("/api/payroll", async (request, reply) => {
    const user = await requirePayrollAccess(request, reply);
    if (!user) return;

    const parsed = payrollQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      await reply.code(400).send({ error: "bad_query" });
      return;
    }

    const now = new Date();
    const year = parsed.data.year || now.getFullYear();
    const month = parsed.data.month || now.getMonth() + 1;
    return getPayrollMonth(user, year, month);
  });

  app.post("/api/payroll/obligations", async (request, reply) => {
    const user = await requirePayrollManager(request, reply);
    if (!user) return;
    const parsed = obligationCreateSchema.safeParse(request.body);
    if (!parsed.success) {
      await reply.code(400).send({ error: "bad_obligation" });
      return;
    }
    const result = await query<{ id: string }>(
      `
        INSERT INTO employee_obligations (employee_id, title, amount_total, note, created_by)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `,
      [parsed.data.employeeId, parsed.data.title, parsed.data.amountTotal, parsed.data.note || null, user.id]
    );
    return { ok: true, id: result.rows[0].id };
  });

  app.post("/api/payroll/obligations/:id/pay", async (request, reply) => {
    const user = await requirePayrollManager(request, reply);
    if (!user) return;
    const params = idParamSchema.safeParse(request.params);
    const parsed = obligationPaySchema.safeParse(request.body);
    if (!params.success || !parsed.success) {
      await reply.code(400).send({ error: "bad_obligation" });
      return;
    }
    // Платёж уменьшает остаток; не больше общей суммы. При полном погашении — закрываем.
    await query(
      `
        UPDATE employee_obligations
        SET amount_paid = LEAST(amount_total, amount_paid + $2),
            is_active = (LEAST(amount_total, amount_paid + $2) < amount_total),
            updated_at = now()
        WHERE id = $1
      `,
      [params.data.id, parsed.data.amount]
    );
    return { ok: true };
  });

  app.patch("/api/payroll/obligations/:id", async (request, reply) => {
    const user = await requirePayrollManager(request, reply);
    if (!user) return;
    const params = idParamSchema.safeParse(request.params);
    const parsed = obligationPatchSchema.safeParse(request.body);
    if (!params.success || !parsed.success) {
      await reply.code(400).send({ error: "bad_obligation" });
      return;
    }
    await query(
      `
        UPDATE employee_obligations
        SET title = COALESCE($2, title),
            amount_total = COALESCE($3, amount_total),
            note = COALESCE($4, note),
            updated_at = now()
        WHERE id = $1
      `,
      [params.data.id, parsed.data.title ?? null, parsed.data.amountTotal ?? null, parsed.data.note ?? null]
    );
    return { ok: true };
  });

  app.delete("/api/payroll/obligations/:id", async (request, reply) => {
    const user = await requirePayrollManager(request, reply);
    if (!user) return;
    const params = idParamSchema.safeParse(request.params);
    if (!params.success) {
      await reply.code(400).send({ error: "bad_obligation" });
      return;
    }
    await query("UPDATE employee_obligations SET is_active = false, updated_at = now() WHERE id = $1", [params.data.id]);
    return { ok: true };
  });
}

function isPayrollManager(user: SessionUser): boolean {
  return user.role === "owner" || user.role === "manager";
}

const RU_MONTHS = ["январь", "февраль", "март", "апрель", "май", "июнь", "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь"];
function ruMonth(dateStr: string): string {
  const [y, m] = dateStr.split("-");
  return `${RU_MONTHS[Number(m) - 1] || m} ${y}`;
}

async function requirePayrollAccess(request: FastifyRequest, reply: FastifyReply): Promise<SessionUser | undefined> {
  return requireUser(request, reply);
}

async function requirePayrollManager(request: FastifyRequest, reply: FastifyReply): Promise<SessionUser | undefined> {
  const user = await requireUser(request, reply);
  if (!user) return undefined;
  if (!isPayrollManager(user)) {
    await reply.code(403).send({ error: "forbidden" });
    return undefined;
  }
  return user;
}

async function getPayrollMonth(user: SessionUser, year: number, month: number) {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const [shiftRows, payoutRows, paydayRows, hookahRows, employeeFlags, taskRewardRows, goalRewardRows] = await Promise.all([
    query<ShiftRow>(
      `
        SELECT work_date::text, planned_hours, pay_amount, pay_model
        FROM schedule_shifts
        WHERE employee_id = $2
          AND work_date >= $1::date
          AND work_date < ($1::date + interval '1 month')
        ORDER BY work_date
      `,
      [start, user.id]
    ),
    query<PayoutRow>(
      `
        SELECT p.id::text, p.work_date::text, p.amount, p.created_at::text,
               p.apply_month::text, o.title AS obligation_title
        FROM payroll_payouts p
        LEFT JOIN employee_obligations o ON o.id = p.obligation_id
        WHERE p.employee_id = $2
          AND COALESCE(p.apply_month, date_trunc('month', p.work_date)::date) >= $1::date
          AND COALESCE(p.apply_month, date_trunc('month', p.work_date)::date) < ($1::date + interval '1 month')
        ORDER BY p.work_date DESC, p.created_at DESC
      `,
      [start, user.id]
    ),
    query<PaydayRow>(
      `
        SELECT work_date::text
        FROM payroll_planned_days
        WHERE employee_id = $2
          AND work_date >= $1::date
          AND work_date < ($1::date + interval '1 month')
        ORDER BY work_date
      `,
      [start, user.id]
    ),
    query<HookahRow>(
      `
        SELECT h.id::text, sc.work_date::text, h.count AS hookah_count, h.rate AS hookah_rate, h.payout AS hookah_payout
        FROM shift_closing_hookah h
        JOIN shift_closings sc ON sc.id = h.shift_closing_id
        WHERE h.employee_id = $2
          AND sc.work_date >= $1::date
          AND sc.work_date < ($1::date + interval '1 month')
          AND h.payout > 0
        ORDER BY sc.work_date DESC, h.created_at DESC
      `,
      [start, user.id]
    ),
    query<EmployeePayrollFlagsRow>(
      `
        SELECT is_hookah_master
        FROM employees
        WHERE id = $1
        LIMIT 1
      `,
      [user.id]
    ),
    query<TaskRewardRow>(
      `
        SELECT id::text, title, reward_amount, approved_at::text AS updated_at
        FROM tasks
        WHERE employee_id = $2
          AND status = 'done'
          AND approved_at IS NOT NULL
          AND reward_amount IS NOT NULL
          AND reward_amount > 0
          AND approved_at >= $1::date
          AND approved_at < ($1::date + interval '1 month')
        ORDER BY approved_at DESC
      `,
      [start, user.id]
    ),
    query<GoalRewardRow>(
      `
        SELECT id::text, title, reward_amount, confirmed_at::text
        FROM sales_goals
        WHERE employee_id = $2
          AND status = 'confirmed'
          AND reward_amount IS NOT NULL
          AND reward_amount > 0
          AND confirmed_at >= $1::date
          AND confirmed_at < ($1::date + interval '1 month')
        ORDER BY confirmed_at DESC
      `,
      [start, user.id]
    )
  ]);

  // Прошлые месяцы (нет календаря): смены/часы/начислено из ручной истории.
  const history = await query<{ shifts: number; hours: string; accrued: number }>(
    "SELECT shifts, hours, accrued FROM payroll_history WHERE employee_id = $1 AND period_month = $2::date",
    [user.id, start]
  );
  const hist = history.rows[0];
  const histAccrued = Number(hist?.accrued || 0);
  const histShifts = Number(hist?.shifts || 0);
  const histHours = Number(hist?.hours || 0);

  // Долг за прошлые месяцы: накоплено по истории минус выплаченное именно за те месяцы.
  const debtRow = await query<{ debt: string }>(
    `SELECT COALESCE(SUM(GREATEST(0, h.accrued - COALESCE(p.paid, 0))), 0)::text AS debt
     FROM payroll_history h
     LEFT JOIN (
       SELECT COALESCE(apply_month, date_trunc('month', work_date)::date) AS m, SUM(amount) AS paid
       FROM payroll_payouts WHERE employee_id = $1 GROUP BY 1
     ) p ON p.m = h.period_month
     WHERE h.employee_id = $1`,
    [user.id]
  );
  const pastDebt = Number(debtRow.rows[0]?.debt || 0);

  // Разбивка начислений по сменам для наглядной расшифровки дохода в ЛК:
  // почасовые / фикс-ставка / корпоративы (разовые выплаты за спецмероприятия).
  const kindOf = (m: string | null) => (m === "event" ? "event" : m === "fixed" ? "fixed" : "hourly");
  const sumPay = (rows: ShiftRow[]) => rows.reduce((s, r) => s + Number(r.pay_amount || 0), 0);
  const hourlyRows = shiftRows.rows.filter((r) => kindOf(r.pay_model) === "hourly");
  const fixedRows = shiftRows.rows.filter((r) => kindOf(r.pay_model) === "fixed");
  const eventRows = shiftRows.rows.filter((r) => kindOf(r.pay_model) === "event");
  const hourlyAccrued = sumPay(hourlyRows);
  const fixedAccrued = sumPay(fixedRows);
  const eventAccrued = sumPay(eventRows);
  const hourlyHours = hourlyRows.reduce((s, r) => s + Number(r.planned_hours || 0), 0);

  const salaryAccruedTotal = shiftRows.rows.reduce((sum, row) => sum + Number(row.pay_amount || 0), 0) + histAccrued;
  const salaryPaidTotal = payoutRows.rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const hookahAccruedTotal = hookahRows.rows.reduce((sum, row) => sum + Number(row.hookah_payout || 0), 0);
  const hookahCountTotal = hookahRows.rows.reduce((sum, row) => sum + Number(row.hookah_count || 0), 0);
  const taskRewardTotal = taskRewardRows.rows.reduce((sum, row) => sum + Number(row.reward_amount || 0), 0);
  const goalRewardTotal = goalRewardRows.rows.reduce((sum, row) => sum + Number(row.reward_amount || 0), 0);
  const streakReward = await streakRewardsForMonth(user.id, start);
  const streakRewardTotal = streakReward.total;
  const hoursTotal = shiftRows.rows.reduce((sum, row) => sum + Number(row.planned_hours || 0), 0) + histHours;
  const todayIso = new Date().toISOString().slice(0, 10);
  const upcomingPayday = paydayRows.rows.find((row) => row.work_date >= todayIso)?.work_date || paydayRows.rows.at(-1)?.work_date || "";

  // Личные обязательства руководителя перед сотрудником (видны, пока остаток > 0).
  const manager = isPayrollManager(user);
  const obligationRows = await query<ObligationRow>(
    `
      SELECT id::text, title, amount_total, amount_paid, note, updated_at::text
      FROM employee_obligations
      WHERE employee_id = $1 AND is_active = true AND amount_total > amount_paid
      ORDER BY created_at
    `,
    [user.id]
  );
  // Платежи по обязательствам (для истории под каждым обязательством в ЛК).
  const obligationPayRows = await query<{ obligation_id: string; work_date: string; amount: number }>(
    `SELECT obligation_id::text, work_date::text, amount
     FROM payroll_payouts
     WHERE employee_id = $1 AND obligation_id IS NOT NULL
     ORDER BY work_date DESC, created_at DESC`,
    [user.id]
  );
  const oblPaymentsById = new Map<string, Array<{ workDate: string; amount: number }>>();
  for (const r of obligationPayRows.rows) {
    const arr = oblPaymentsById.get(r.obligation_id) || [];
    arr.push({ workDate: r.work_date, amount: Number(r.amount) });
    oblPaymentsById.set(r.obligation_id, arr);
  }
  let manageEmployees: Array<{ id: string; name: string }> = [];
  let allObligations: Array<Record<string, unknown>> = [];
  if (manager) {
    const emps = await query<{ id: string; display_name: string }>(
      `SELECT id::text, display_name FROM employees WHERE is_active = true AND archived_at IS NULL ORDER BY display_name`
    );
    manageEmployees = emps.rows.map((row) => ({ id: row.id, name: row.display_name }));
    const all = await query<ManageObligationRow>(
      `
        SELECT o.id::text, o.employee_id::text, e.display_name AS employee_name,
               o.title, o.amount_total, o.amount_paid, o.note, o.updated_at::text
        FROM employee_obligations o
        JOIN employees e ON e.id = o.employee_id
        WHERE o.is_active = true
        ORDER BY e.display_name, o.created_at
      `
    );
    allObligations = all.rows.map((row) => ({
      id: row.id,
      employeeId: row.employee_id,
      employeeName: row.employee_name,
      title: row.title,
      amountTotal: row.amount_total,
      amountPaid: row.amount_paid,
      remaining: row.amount_total - row.amount_paid,
      note: row.note || ""
    }));
  }

  return {
    canManage: manager,
    obligations: obligationRows.rows.map((row) => ({
      id: row.id,
      title: row.title,
      amountTotal: row.amount_total,
      amountPaid: row.amount_paid,
      remaining: row.amount_total - row.amount_paid,
      note: row.note || "",
      payments: oblPaymentsById.get(row.id) || []
    })),
    manageEmployees,
    allObligations,
    year,
    month,
    employee: {
      id: user.id,
      name: user.display_name,
      role: user.role
    },
    summary: {
      shifts: shiftRows.rows.length + histShifts,
      hours: Math.round(hoursTotal * 100) / 100,
      pastDebt,
      accrued: salaryAccruedTotal + hookahAccruedTotal + taskRewardTotal + goalRewardTotal + streakRewardTotal,
      paid: salaryPaidTotal + hookahAccruedTotal,
      remaining: Math.max(0, salaryAccruedTotal + taskRewardTotal + goalRewardTotal + streakRewardTotal - salaryPaidTotal),
      salaryAccrued: salaryAccruedTotal,
      salaryPaid: salaryPaidTotal,
      // Расшифровка начислений по сменам (для блока «из чего сложился доход»).
      hourlyAccrued,
      hourlyShifts: hourlyRows.length,
      hourlyHours: Math.round(hourlyHours * 100) / 100,
      fixedAccrued,
      fixedShifts: fixedRows.length,
      eventAccrued,
      eventShifts: eventRows.length,
      historyAccrued: histAccrued,
      taskRewardAccrued: taskRewardTotal,
      taskRewardCount: taskRewardRows.rows.length,
      goalRewardAccrued: goalRewardTotal,
      goalRewardCount: goalRewardRows.rows.length,
      streakRewardAccrued: streakRewardTotal,
      streakRewardCount: streakReward.count,
      hookahAccrued: hookahAccruedTotal,
      hookahPaid: hookahAccruedTotal,
      hookahCount: hookahCountTotal,
      hookahShifts: hookahRows.rows.length,
      isHookahMaster: employeeFlags.rows[0]?.is_hookah_master || false,
      upcomingPayday
    },
    shifts: shiftRows.rows.map((row) => ({
      workDate: row.work_date,
      hours: row.planned_hours ? Number(row.planned_hours) : null,
      payAmount: row.pay_amount || 0,
      payModel: row.pay_model || ""
    })),
    payouts: payoutRows.rows.map((row) => ({
      id: row.id,
      workDate: row.work_date,
      amount: row.amount,
      createdAt: row.created_at,
      note: row.obligation_title
        ? `обязательство: ${row.obligation_title}`
        : row.apply_month
          ? `за ${ruMonth(row.apply_month)}`
          : ""
    })),
    hookah: hookahRows.rows.map((row) => ({
      id: row.id,
      workDate: row.work_date,
      count: row.hookah_count,
      rate: row.hookah_rate,
      amount: row.hookah_payout
    })),
    taskRewards: taskRewardRows.rows.map((row) => ({
      id: row.id,
      title: row.title,
      amount: Number(row.reward_amount || 0),
      doneAt: row.updated_at
    })),
    goalRewards: goalRewardRows.rows.map((row) => ({
      id: row.id,
      title: row.title,
      amount: Number(row.reward_amount || 0),
      doneAt: row.confirmed_at
    })),
    plannedPaydays: paydayRows.rows.map((row) => row.work_date)
  };
}
