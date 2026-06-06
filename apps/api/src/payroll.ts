import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { requireUser, type SessionUser } from "./auth.js";
import { query } from "./db.js";

const payrollQuerySchema = z.object({
  year: z.coerce.number().int().min(2020).max(2100).optional(),
  month: z.coerce.number().int().min(1).max(12).optional()
});

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
}

async function requirePayrollAccess(request: FastifyRequest, reply: FastifyReply): Promise<SessionUser | undefined> {
  return requireUser(request, reply);
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
        SELECT id::text, work_date::text, amount, created_at::text
        FROM payroll_payouts
        WHERE employee_id = $2
          AND work_date >= $1::date
          AND work_date < ($1::date + interval '1 month')
        ORDER BY work_date DESC, created_at DESC
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
        SELECT id::text, work_date::text, hookah_count, hookah_rate, hookah_payout
        FROM shift_closings
        WHERE hookah_employee_id = $2
          AND work_date >= $1::date
          AND work_date < ($1::date + interval '1 month')
          AND hookah_payout > 0
        ORDER BY work_date DESC, updated_at DESC
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
        SELECT id::text, title, reward_amount, updated_at::text
        FROM tasks
        WHERE employee_id = $2
          AND status = 'done'
          AND reward_amount IS NOT NULL
          AND reward_amount > 0
          AND updated_at >= $1::date
          AND updated_at < ($1::date + interval '1 month')
        ORDER BY updated_at DESC
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

  const salaryAccruedTotal = shiftRows.rows.reduce((sum, row) => sum + Number(row.pay_amount || 0), 0);
  const salaryPaidTotal = payoutRows.rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const hookahAccruedTotal = hookahRows.rows.reduce((sum, row) => sum + Number(row.hookah_payout || 0), 0);
  const hookahCountTotal = hookahRows.rows.reduce((sum, row) => sum + Number(row.hookah_count || 0), 0);
  const taskRewardTotal = taskRewardRows.rows.reduce((sum, row) => sum + Number(row.reward_amount || 0), 0);
  const goalRewardTotal = goalRewardRows.rows.reduce((sum, row) => sum + Number(row.reward_amount || 0), 0);
  const hoursTotal = shiftRows.rows.reduce((sum, row) => sum + Number(row.planned_hours || 0), 0);
  const todayIso = new Date().toISOString().slice(0, 10);
  const upcomingPayday = paydayRows.rows.find((row) => row.work_date >= todayIso)?.work_date || paydayRows.rows.at(-1)?.work_date || "";

  return {
    year,
    month,
    employee: {
      id: user.id,
      name: user.display_name,
      role: user.role
    },
    summary: {
      shifts: shiftRows.rows.length,
      hours: Math.round(hoursTotal * 100) / 100,
      accrued: salaryAccruedTotal + hookahAccruedTotal + taskRewardTotal + goalRewardTotal,
      paid: salaryPaidTotal + hookahAccruedTotal,
      remaining: Math.max(0, salaryAccruedTotal + taskRewardTotal + goalRewardTotal - salaryPaidTotal),
      salaryAccrued: salaryAccruedTotal,
      salaryPaid: salaryPaidTotal,
      taskRewardAccrued: taskRewardTotal,
      taskRewardCount: taskRewardRows.rows.length,
      goalRewardAccrued: goalRewardTotal,
      goalRewardCount: goalRewardRows.rows.length,
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
      createdAt: row.created_at
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
