import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { audit, requireUser, type SessionUser } from "./auth.js";
import { pool, query } from "./db.js";

const roleLabels: Record<string, string> = {
  cook: "Повар",
  bar: "Бармен",
  waiter: "Официант",
  dish: "Мойщица",
  dishwasher: "Мойщица",
  other: "Сотрудник"
};

const importSchema = z.object({
  backup: z.object({
    employees: z.array(z.record(z.string(), z.unknown())),
    shifts: z.record(z.string(), z.record(z.string(), z.unknown())).optional(),
    marks: z.record(z.string(), z.unknown()).optional(),
    payouts: z.record(z.string(), z.unknown()).optional(),
    scores: z.record(z.string(), z.unknown()).optional(),
    year: z.number().optional(),
    month: z.number().optional()
  })
});

const scheduleQuerySchema = z.object({
  year: z.coerce.number().int().min(2020).max(2100).optional(),
  month: z.coerce.number().int().min(1).max(12).optional()
});

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const employeeDateSchema = z.object({
  workDate: dateSchema,
  employeeId: z.string().uuid()
});

const shiftEditSchema = employeeDateSchema.extend({
  hours: z.number().positive().max(24).optional(),
  payAmount: z.number().int().positive().max(100000).optional()
});

const dayEditSchema = z.object({
  workDate: dateSchema,
  isDeadline: z.boolean()
});

const payoutCreateSchema = employeeDateSchema.extend({
  amount: z.number().int().positive().max(1000000),
  applyMonth: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  obligationId: z.string().uuid().nullable().optional()
});

const payoutParamsSchema = z.object({
  id: z.string().uuid()
});

const payoutUpdateSchema = z.object({
  amount: z.number().int().positive().max(1000000).optional(),
  applyMonth: z.string().regex(/^\d{4}-\d{2}$/).nullable().optional()
});

const scoreEditSchema = employeeDateSchema.extend({
  score: z.enum(["green", "yellow", "red"])
});

type ImportedEmployee = {
  id: string;
  name: string;
  role: string;
  hours: number | null;
  rate: number | null;
  payModel: "hourly" | "fixed";
};

type ImportedBackup = z.infer<typeof importSchema>["backup"];

export function registerScheduleRoutes(app: FastifyInstance): void {
  app.get("/api/schedule", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return;

    const parsed = scheduleQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      await reply.code(400).send({ error: "bad_query" });
      return;
    }

    const now = new Date();
    const year = parsed.data.year || now.getFullYear();
    const month = parsed.data.month || now.getMonth() + 1;
    return getScheduleMonth(user, year, month);
  });

  app.post("/api/schedule/import", async (request, reply) => {
    const user = await requireManager(request, reply);
    if (!user) return;

    const parsed = importSchema.safeParse(request.body);
    if (!parsed.success) {
      await reply.code(400).send({ error: "bad_backup" });
      return;
    }

    const result = await importBackup(parsed.data.backup, user.id);
    await audit(request, "schedule_import", user.id, "schedule", "backup", result);
    return result;
  });

  app.put("/api/schedule/shifts", async (request, reply) => {
    const user = await requireManager(request, reply);
    if (!user) return;

    const parsed = shiftEditSchema.safeParse(request.body);
    if (!parsed.success) {
      await reply.code(400).send({ error: "bad_shift" });
      return;
    }

    const result = await upsertShift(parsed.data, user.id);
    await audit(request, "schedule_shift_upsert", user.id, "schedule_shift", `${parsed.data.workDate}:${parsed.data.employeeId}`, result);
    return result;
  });

  app.delete("/api/schedule/shifts", async (request, reply) => {
    const user = await requireManager(request, reply);
    if (!user) return;

    const parsed = employeeDateSchema.safeParse(request.body);
    if (!parsed.success) {
      await reply.code(400).send({ error: "bad_shift" });
      return;
    }

    await query("DELETE FROM schedule_shifts WHERE work_date = $1::date AND employee_id = $2", [parsed.data.workDate, parsed.data.employeeId]);
    await audit(request, "schedule_shift_delete", user.id, "schedule_shift", `${parsed.data.workDate}:${parsed.data.employeeId}`);
    return { ok: true };
  });

  app.patch("/api/schedule/days", async (request, reply) => {
    const user = await requireManager(request, reply);
    if (!user) return;

    const parsed = dayEditSchema.safeParse(request.body);
    if (!parsed.success) {
      await reply.code(400).send({ error: "bad_day" });
      return;
    }

    await query(
      `
        INSERT INTO schedule_days (work_date, is_deadline)
        VALUES ($1::date, $2)
        ON CONFLICT (work_date) DO UPDATE
        SET is_deadline = excluded.is_deadline,
            updated_at = now()
      `,
      [parsed.data.workDate, parsed.data.isDeadline]
    );
    await audit(request, "schedule_day_update", user.id, "schedule_day", parsed.data.workDate, parsed.data);
    return { ok: true };
  });

  app.put("/api/schedule/planned-paydays", async (request, reply) => {
    const user = await requireManager(request, reply);
    if (!user) return;

    const parsed = employeeDateSchema.safeParse(request.body);
    if (!parsed.success) {
      await reply.code(400).send({ error: "bad_planned_payday" });
      return;
    }

    await ensureScheduleDay(parsed.data.workDate);
    await query(
      `
        INSERT INTO payroll_planned_days (work_date, employee_id, created_by)
        VALUES ($1::date, $2, $3)
        ON CONFLICT (work_date, employee_id) DO NOTHING
      `,
      [parsed.data.workDate, parsed.data.employeeId, user.id]
    );
    await audit(request, "payroll_planned_day_set", user.id, "payroll_planned_day", `${parsed.data.workDate}:${parsed.data.employeeId}`);
    return { ok: true };
  });

  app.delete("/api/schedule/planned-paydays", async (request, reply) => {
    const user = await requireManager(request, reply);
    if (!user) return;

    const parsed = employeeDateSchema.safeParse(request.body);
    if (!parsed.success) {
      await reply.code(400).send({ error: "bad_planned_payday" });
      return;
    }

    await query("DELETE FROM payroll_planned_days WHERE work_date = $1::date AND employee_id = $2", [parsed.data.workDate, parsed.data.employeeId]);
    await audit(request, "payroll_planned_day_delete", user.id, "payroll_planned_day", `${parsed.data.workDate}:${parsed.data.employeeId}`);
    return { ok: true };
  });

  app.post("/api/schedule/payouts", async (request, reply) => {
    const user = await requireManager(request, reply);
    if (!user) return;

    const parsed = payoutCreateSchema.safeParse(request.body);
    if (!parsed.success) {
      await reply.code(400).send({ error: "bad_payout" });
      return;
    }

    await ensureScheduleDay(parsed.data.workDate);
    const applyMonth = parsed.data.applyMonth ? `${parsed.data.applyMonth}-01` : null;
    const obligationId = parsed.data.obligationId || null;
    const result = await query<{ id: string }>(
      `
        INSERT INTO payroll_payouts (work_date, employee_id, amount, created_by, apply_month, obligation_id)
        VALUES ($1::date, $2, $3, $4, $5::date, $6)
        RETURNING id
      `,
      [parsed.data.workDate, parsed.data.employeeId, parsed.data.amount, user.id, applyMonth, obligationId]
    );
    // Если выплата гасит личное обязательство — уменьшаем его остаток (как в payroll obligations/pay).
    if (obligationId) {
      await query(
        `UPDATE employee_obligations
         SET amount_paid = LEAST(amount_total, amount_paid + $2),
             is_active = (LEAST(amount_total, amount_paid + $2) < amount_total),
             updated_at = now()
         WHERE id = $1 AND employee_id = $3`,
        [obligationId, parsed.data.amount, parsed.data.employeeId]
      );
    }
    await audit(request, "payroll_payout_create", user.id, "payroll_payout", result.rows[0].id, parsed.data);
    return { ok: true, id: result.rows[0].id };
  });

  app.delete("/api/schedule/payouts/:id", async (request, reply) => {
    const user = await requireManager(request, reply);
    if (!user) return;

    const parsed = payoutParamsSchema.safeParse(request.params);
    if (!parsed.success) {
      await reply.code(400).send({ error: "bad_payout" });
      return;
    }

    // Если выплата гасила обязательство — возвращаем остаток обратно.
    const removed = await query<{ amount: number; obligation_id: string | null }>(
      "DELETE FROM payroll_payouts WHERE id = $1 RETURNING amount, obligation_id::text",
      [parsed.data.id]
    );
    const row = removed.rows[0];
    if (row?.obligation_id) {
      await query(
        `UPDATE employee_obligations
         SET amount_paid = GREATEST(0, amount_paid - $2), is_active = true, updated_at = now()
         WHERE id = $1`,
        [row.obligation_id, row.amount]
      );
    }
    await audit(request, "payroll_payout_delete", user.id, "payroll_payout", parsed.data.id);
    return { ok: true };
  });

  // Правка выплаты: сумма и/или месяц начисления (apply_month). Если выплата привязана к обязательству
  // и меняется сумма — корректируем остаток обязательства на дельту.
  app.patch("/api/schedule/payouts/:id", async (request, reply) => {
    const user = await requireManager(request, reply);
    if (!user) return;

    const params = payoutParamsSchema.safeParse(request.params);
    const parsed = payoutUpdateSchema.safeParse(request.body);
    if (!params.success || !parsed.success) {
      await reply.code(400).send({ error: "bad_payout" });
      return;
    }

    const current = await query<{ amount: number; obligation_id: string | null }>(
      "SELECT amount, obligation_id::text FROM payroll_payouts WHERE id = $1",
      [params.data.id]
    );
    const row = current.rows[0];
    if (!row) {
      await reply.code(404).send({ error: "not_found" });
      return;
    }

    const newAmount = parsed.data.amount ?? row.amount;
    // applyMonth: undefined — не трогаем; null — сбросить на месяц смены; строка — конкретный месяц.
    const applyMonthProvided = parsed.data.applyMonth !== undefined;
    const applyMonth = parsed.data.applyMonth ? `${parsed.data.applyMonth}-01` : null;

    if (row.obligation_id && parsed.data.amount !== undefined && newAmount !== row.amount) {
      const delta = newAmount - row.amount;
      await query(
        `UPDATE employee_obligations
         SET amount_paid = GREATEST(0, LEAST(amount_total, amount_paid + $2)),
             is_active = (GREATEST(0, LEAST(amount_total, amount_paid + $2)) < amount_total),
             updated_at = now()
         WHERE id = $1`,
        [row.obligation_id, delta]
      );
    }

    if (applyMonthProvided) {
      await query(
        "UPDATE payroll_payouts SET amount = $2, apply_month = $3::date WHERE id = $1",
        [params.data.id, newAmount, applyMonth]
      );
    } else {
      await query("UPDATE payroll_payouts SET amount = $2 WHERE id = $1", [params.data.id, newAmount]);
    }
    await audit(request, "payroll_payout_update", user.id, "payroll_payout", params.data.id, parsed.data);
    return { ok: true };
  });

  app.put("/api/schedule/scores", async (request, reply) => {
    const user = await requireManager(request, reply);
    if (!user) return;

    const parsed = scoreEditSchema.safeParse(request.body);
    if (!parsed.success) {
      await reply.code(400).send({ error: "bad_score" });
      return;
    }

    await ensureScheduleDay(parsed.data.workDate);
    await query(
      `
        INSERT INTO employee_scores (work_date, employee_id, score, created_by)
        VALUES ($1::date, $2, $3::score_value, $4)
        ON CONFLICT (work_date, employee_id) DO UPDATE
        SET score = excluded.score,
            created_by = excluded.created_by,
            updated_at = now()
      `,
      [parsed.data.workDate, parsed.data.employeeId, parsed.data.score, user.id]
    );
    await audit(request, "employee_score_set", user.id, "employee_score", `${parsed.data.workDate}:${parsed.data.employeeId}`, parsed.data);
    return { ok: true };
  });

  app.delete("/api/schedule/scores", async (request, reply) => {
    const user = await requireManager(request, reply);
    if (!user) return;

    const parsed = employeeDateSchema.safeParse(request.body);
    if (!parsed.success) {
      await reply.code(400).send({ error: "bad_score" });
      return;
    }

    await query("DELETE FROM employee_scores WHERE work_date = $1::date AND employee_id = $2", [parsed.data.workDate, parsed.data.employeeId]);
    await audit(request, "employee_score_delete", user.id, "employee_score", `${parsed.data.workDate}:${parsed.data.employeeId}`);
    return { ok: true };
  });
}

async function requireManager(request: FastifyRequest, reply: FastifyReply): Promise<SessionUser | undefined> {
  const user = await requireUser(request, reply);
  if (!user) return undefined;
  if (user.role !== "owner" && user.role !== "manager") {
    await reply.code(403).send({ error: "forbidden" });
    return undefined;
  }
  return user;
}

async function getScheduleMonth(user: SessionUser, year: number, month: number) {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const employeeRows = await query<{
    id: string;
    display_name: string;
    role: string;
    schedule_role: string | null;
    default_hours: string | null;
    hourly_rate: number | null;
    pay_model: string | null;
    birth_date: string | null;
  }>(
    `
      SELECT id, display_name, role, schedule_role, default_hours, hourly_rate, pay_model, birth_date::text
      FROM employees
      WHERE is_active = true
        AND (
          schedule_role IS NOT NULL
          OR id IN (
            SELECT employee_id
            FROM schedule_shifts
            WHERE work_date >= $1::date
              AND work_date < ($1::date + interval '1 month')
          )
        )
      ORDER BY
        CASE COALESCE(schedule_role, role::text)
          WHEN 'cook' THEN 1
          WHEN 'bar' THEN 2
          WHEN 'waiter' THEN 3
          WHEN 'dish' THEN 4
          WHEN 'dishwasher' THEN 4
          ELSE 9
        END,
        display_name
    `,
    [start]
  );

  const shiftRows = await query<{
    work_date: string;
    employee_id: string;
    planned_hours: string | null;
    actual_end_time: string | null;
    pay_amount: number | null;
    pay_model: string | null;
  }>(
    `
      SELECT work_date::text, employee_id, planned_hours, actual_end_time::text, pay_amount, pay_model
      FROM schedule_shifts
      WHERE work_date >= $1::date
        AND work_date < ($1::date + interval '1 month')
      ORDER BY work_date
    `,
    [start]
  );

  const dayRows = await query<{ work_date: string; is_deadline: boolean }>(
    `
      SELECT work_date::text, is_deadline
      FROM schedule_days
      WHERE work_date >= $1::date
        AND work_date < ($1::date + interval '1 month')
      ORDER BY work_date
    `,
    [start]
  );

  const plannedPayRows = await query<{ work_date: string; employee_id: string }>(
    `
      SELECT work_date::text, employee_id
      FROM payroll_planned_days
      WHERE work_date >= $1::date
        AND work_date < ($1::date + interval '1 month')
    `,
    [start]
  );

  const canSeeAllMoney = user.role === "owner" || user.role === "manager";
  const payoutRows = await query<{ id: string; work_date: string; employee_id: string; amount: number; apply_month: string | null; obligation_id: string | null; obligation_title: string | null }>(
    `
      SELECT p.id::text, p.work_date::text, p.employee_id, p.amount, p.apply_month::text,
             p.obligation_id::text, o.title AS obligation_title
      FROM payroll_payouts p
      LEFT JOIN employee_obligations o ON o.id = p.obligation_id
      WHERE p.work_date >= $1::date
        AND p.work_date < ($1::date + interval '1 month')
        AND ($2::boolean = true OR p.employee_id = $3::uuid)
    `,
    [start, canSeeAllMoney, user.id]
  );

  const scoreRows = await query<{ work_date: string; employee_id: string; score: string }>(
    `
      SELECT work_date::text, employee_id, score::text
      FROM employee_scores
      WHERE work_date >= $1::date
        AND work_date < ($1::date + interval '1 month')
        AND ($2::boolean = true OR employee_id = $3::uuid)
    `,
    [start, canSeeAllMoney, user.id]
  );

  const shiftsByDate = new Map<string, Record<string, unknown>>();
  const employeeTotals = new Map<string, { accrued: number; paid: number; shifts: number }>();
  const daysWithShifts = new Set<string>();

  for (const row of shiftRows.rows) {
    const date = row.work_date;
    const item = {
      employeeId: row.employee_id,
      hours: row.planned_hours ? Number(row.planned_hours) : null,
      actualEndTime: row.actual_end_time,
      payAmount: canSeeAllMoney ? row.pay_amount || 0 : null,
      payModel: row.pay_model
    };
    shiftsByDate.set(date, {
      ...(shiftsByDate.get(date) || {}),
      [row.employee_id]: item
    });
    daysWithShifts.add(date);
    const total = employeeTotals.get(row.employee_id) || { accrued: 0, paid: 0, shifts: 0 };
    total.accrued += row.pay_amount || 0;
    total.shifts += 1;
    employeeTotals.set(row.employee_id, total);
  }

  // «Выплачено за месяц» считаем по МЕСЯЦУ НАЗНАЧЕНИЯ (apply_month), а не по дате выплаты в календаре,
  // чтобы плитки/итоги показывали погашение именно того месяца (выплата июня за май учитывается в мае).
  const paidByMonth = await query<{ employee_id: string; paid: number }>(
    `
      SELECT employee_id, SUM(amount)::int AS paid
      FROM payroll_payouts
      WHERE COALESCE(apply_month, date_trunc('month', work_date)::date) >= $1::date
        AND COALESCE(apply_month, date_trunc('month', work_date)::date) < ($1::date + interval '1 month')
        AND ($2::boolean = true OR employee_id = $3::uuid)
      GROUP BY employee_id
    `,
    [start, canSeeAllMoney, user.id]
  );
  for (const row of paidByMonth.rows) {
    const total = employeeTotals.get(row.employee_id) || { accrued: 0, paid: 0, shifts: 0 };
    total.paid += Number(row.paid || 0);
    employeeTotals.set(row.employee_id, total);
  }

  // Доп. начисления месяца для плиток графика (как в ЛК): премии за задачи, цели продаж, кальяны.
  // Премии/цели входят и в «начислено», и в «остаток»; кальяны — только в «начислено» (выдаются сразу).
  const [taskRewardByEmp, goalRewardByEmp, hookahByEmp, streakByEmp] = await Promise.all([
    query<{ employee_id: string; v: number }>(
      `SELECT employee_id, SUM(reward_amount)::int AS v FROM tasks
       WHERE status = 'done' AND reward_amount IS NOT NULL AND reward_amount > 0
         AND updated_at >= $1::date AND updated_at < ($1::date + interval '1 month')
       GROUP BY employee_id`,
      [start]
    ),
    query<{ employee_id: string; v: number }>(
      `SELECT employee_id, SUM(reward_amount)::int AS v FROM sales_goals
       WHERE status = 'confirmed' AND reward_amount IS NOT NULL AND reward_amount > 0
         AND confirmed_at >= $1::date AND confirmed_at < ($1::date + interval '1 month')
       GROUP BY employee_id`,
      [start]
    ),
    query<{ employee_id: string; v: number }>(
      `SELECT h.employee_id, SUM(h.payout)::int AS v FROM shift_closing_hookah h
       JOIN shift_closings sc ON sc.id = h.shift_closing_id
       WHERE sc.work_date >= $1::date AND sc.work_date < ($1::date + interval '1 month') AND h.payout > 0
       GROUP BY h.employee_id`,
      [start]
    ),
    query<{ employee_id: string; v: number }>(
      `SELECT employee_id, SUM(bonus_amount)::int AS v FROM cash_streak_awards
       WHERE streak_end_date >= $1::date AND streak_end_date < ($1::date + interval '1 month')
       GROUP BY employee_id`,
      [start]
    )
  ]);
  const extrasByEmp = new Map<string, number>();
  const hookahMap = new Map<string, number>();
  for (const r of taskRewardByEmp.rows) extrasByEmp.set(r.employee_id, (extrasByEmp.get(r.employee_id) || 0) + Number(r.v || 0));
  for (const r of goalRewardByEmp.rows) extrasByEmp.set(r.employee_id, (extrasByEmp.get(r.employee_id) || 0) + Number(r.v || 0));
  for (const r of streakByEmp.rows) extrasByEmp.set(r.employee_id, (extrasByEmp.get(r.employee_id) || 0) + Number(r.v || 0));
  for (const r of hookahByEmp.rows) hookahMap.set(r.employee_id, Number(r.v || 0));

  const days = buildMonthDays(year, month).map((date) => {
    const shifts = (shiftsByDate.get(date) || {}) as Record<string, { payAmount?: number }>;
    const dayFot = Object.values(shifts).reduce<number>((sum, value) => sum + Number(value.payAmount || 0), 0);
    return {
      date,
      isDeadline: dayRows.rows.some((row) => row.work_date === date && row.is_deadline),
      plannedPayEmployeeIds: plannedPayRows.rows
        .filter((row) => row.work_date === date && (canSeeAllMoney || row.employee_id === user.id))
        .map((row) => row.employee_id),
      payouts: payoutRows.rows
        .filter((row) => row.work_date === date)
        .map((row) => ({
          id: row.id,
          work_date: row.work_date,
          employee_id: row.employee_id,
          amount: canSeeAllMoney ? row.amount : 0,
          applyMonth: row.apply_month ? row.apply_month.slice(0, 7) : null,
          obligationId: row.obligation_id || null,
          obligationTitle: row.obligation_title || null
        })),
      scores: scoreRows.rows.filter((row) => row.work_date === date),
      shifts,
      coverage: Object.keys(shifts).length,
      fot: canSeeAllMoney ? dayFot : null,
      revenuePlan: canSeeAllMoney ? planRange(dayFot) : null
    };
  });

  const totalFot = canSeeAllMoney
    ? Array.from(employeeTotals.values()).reduce((sum, total) => sum + total.accrued, 0)
    : 0;
  const totalPaid = canSeeAllMoney
    ? Array.from(employeeTotals.values()).reduce((sum, total) => sum + total.paid, 0)
    : 0;

  // Активные личные обязательства (для привязки выплаты к обязательству в окне дня).
  const obligations = canSeeAllMoney
    ? (
        await query<{ id: string; employee_id: string; title: string; remaining: number }>(
          `SELECT id::text, employee_id::text, title, (amount_total - amount_paid) AS remaining
           FROM employee_obligations
           WHERE is_active = true AND amount_total > amount_paid
           ORDER BY created_at`
        )
      ).rows.map((o) => ({ id: o.id, employeeId: o.employee_id, title: o.title, remaining: Number(o.remaining) }))
    : [];

  return {
    year,
    month,
    canSeeMoney: canSeeAllMoney,
    obligations,
    employees: employeeRows.rows.map((employee) => {
      const totals = employeeTotals.get(employee.id) || { accrued: 0, paid: 0, shifts: 0 };
      const payModel = employee.pay_model || (employee.schedule_role === "dish" || employee.role === "dishwasher" ? "fixed" : "hourly");
      return {
        id: employee.id,
        name: employee.display_name,
        role: employee.schedule_role || employee.role,
        roleLabel: roleLabels[employee.schedule_role || employee.role] || "Сотрудник",
        defaultHours: employee.default_hours ? Number(employee.default_hours) : null,
        birthDate: employee.birth_date,
        hourlyRate: canSeeAllMoney ? employee.hourly_rate : null,
        payModel: canSeeAllMoney ? payModel : null,
        totals: (() => {
          const extras = extrasByEmp.get(employee.id) || 0; // премии за задачи + цели
          const hookah = hookahMap.get(employee.id) || 0;
          return {
            shifts: totals.shifts,
            // «Начислено» (доход) = смены + премии/цели + кальяны (как в ЛК).
            accrued: canSeeAllMoney ? totals.accrued + extras + hookah : null,
            paid: canSeeAllMoney ? totals.paid : null,
            // «Остаток к выплате» = смены + премии/цели − выплачено (кальяны выдаются сразу, в остаток не входят).
            remaining: canSeeAllMoney ? Math.max(0, totals.accrued + extras - totals.paid) : null
          };
        })()
      };
    }),
    days,
    summary: {
      totalFot,
      totalPaid,
      totalRemaining: Math.max(0, totalFot - totalPaid),
      workingDays: daysWithShifts.size,
      revenuePlan: canSeeAllMoney ? planRange(totalFot) : null
    }
  };
}

async function upsertShift(
  data: z.infer<typeof shiftEditSchema>,
  actorEmployeeId: string
): Promise<{ ok: true; payAmount: number; plannedHours: number | null; payModel: string }> {
  const employeeResult = await query<{
    id: string;
    default_hours: string | null;
    hourly_rate: number | null;
    pay_model: string | null;
    schedule_role: string | null;
    role: string;
  }>(
    `
      SELECT id, default_hours, hourly_rate, pay_model, schedule_role, role::text
      FROM employees
      WHERE id = $1
        AND is_active = true
      LIMIT 1
    `,
    [data.employeeId]
  );
  const employee = employeeResult.rows[0];
  if (!employee) {
    throw new Error("Employee not found");
  }

  const payModel = employee.pay_model || (employee.schedule_role === "dish" || employee.role === "dishwasher" ? "fixed" : "hourly");
  const hourlyRate = Number(employee.hourly_rate || 0);
  // Часы храним с округлением до 1 знака после запятой, вверх — в пользу сотрудника.
  const rawHours = Number(data.hours || employee.default_hours || 12);
  const plannedHours = payModel === "fixed" ? null : Math.ceil(rawHours * 10) / 10;
  const payAmount = payModel === "fixed"
    ? Number(data.payAmount || 3000)
    : Math.round((plannedHours || 0) * hourlyRate);

  if (!Number.isFinite(payAmount) || payAmount <= 0 || (payModel !== "fixed" && (!plannedHours || plannedHours <= 0))) {
    throw new Error("Bad shift values");
  }

  await ensureScheduleDay(data.workDate);
  await query(
    `
      INSERT INTO schedule_shifts (
        work_date,
        employee_id,
        planned_hours,
        pay_amount,
        pay_model,
        created_by,
        updated_by
      )
      VALUES ($1::date, $2, $3, $4, $5, $6, $6)
      ON CONFLICT (work_date, employee_id) DO UPDATE
      SET planned_hours = excluded.planned_hours,
          pay_amount = excluded.pay_amount,
          pay_model = excluded.pay_model,
          updated_by = excluded.updated_by,
          updated_at = now()
    `,
    [data.workDate, data.employeeId, plannedHours, payAmount, payModel, actorEmployeeId]
  );

  return { ok: true, payAmount, plannedHours, payModel };
}

async function ensureScheduleDay(workDate: string): Promise<void> {
  await query(
    `
      INSERT INTO schedule_days (work_date, is_deadline)
      VALUES ($1::date, false)
      ON CONFLICT (work_date) DO NOTHING
    `,
    [workDate]
  );
}

async function importBackup(backup: ImportedBackup, actorEmployeeId: string) {
  const employees = backup.employees.map(normalizeEmployee).filter(Boolean) as ImportedEmployee[];
  if (!employees.length) throw new Error("No employees in backup");

  const dates = collectBackupDates(backup);
  const employeeIdBySource = new Map<string, string>();

  await pool.query("BEGIN");
  try {
    for (const employee of employees) {
      const result = await pool.query<{ id: string }>(
        `
          INSERT INTO employees (
            source_schedule_id,
            display_name,
            role,
            schedule_role,
            default_hours,
            hourly_rate,
            pay_model,
            is_active
          )
          VALUES ($1, $2, $3::employee_role, $4, $5, $6, $7, true)
          ON CONFLICT (source_schedule_id) DO UPDATE
          SET display_name = excluded.display_name,
              role = excluded.role,
              schedule_role = excluded.schedule_role,
              default_hours = excluded.default_hours,
              hourly_rate = excluded.hourly_rate,
              pay_model = excluded.pay_model,
              is_active = true,
              updated_at = now()
          RETURNING id
        `,
        [
          employee.id,
          employee.name,
          toEmployeeRole(employee.role),
          employee.role,
          employee.hours,
          employee.rate,
          employee.payModel
        ]
      );
      employeeIdBySource.set(employee.id, result.rows[0].id);
    }

    if (dates.length) {
      await pool.query("DELETE FROM payroll_payouts WHERE work_date = ANY($1::date[])", [dates]);
      await pool.query("DELETE FROM payroll_planned_days WHERE work_date = ANY($1::date[])", [dates]);
      await pool.query("DELETE FROM employee_scores WHERE work_date = ANY($1::date[])", [dates]);
      await pool.query("DELETE FROM schedule_shifts WHERE work_date = ANY($1::date[])", [dates]);
      await pool.query("DELETE FROM schedule_days WHERE work_date = ANY($1::date[])", [dates]);
    }

    let shiftCount = 0;
    let plannedPayCount = 0;
    let payoutCount = 0;
    let scoreCount = 0;
    let deadlineCount = 0;

    for (const date of dates) {
      const mark = readMark(backup.marks?.[date]);
      if (mark.task) deadlineCount += 1;
      await pool.query(
        `
          INSERT INTO schedule_days (work_date, is_deadline)
          VALUES ($1::date, $2)
          ON CONFLICT (work_date) DO UPDATE
          SET is_deadline = excluded.is_deadline,
              updated_at = now()
        `,
        [date, mark.task]
      );

      for (const sourceEmployeeId of mark.pay) {
        const employeeId = employeeIdBySource.get(sourceEmployeeId);
        if (!employeeId) continue;
        plannedPayCount += 1;
        await pool.query(
          `
            INSERT INTO payroll_planned_days (work_date, employee_id, created_by)
            VALUES ($1::date, $2, $3)
            ON CONFLICT (work_date, employee_id) DO NOTHING
          `,
          [date, employeeId, actorEmployeeId]
        );
      }
    }

    for (const [date, row] of Object.entries(backup.shifts || {})) {
      if (!isDateKey(date) || !row || typeof row !== "object") continue;
      for (const [sourceEmployeeId, rawValue] of Object.entries(row)) {
        const employee = employees.find((item) => item.id === sourceEmployeeId);
        const employeeId = employeeIdBySource.get(sourceEmployeeId);
        const value = Number(rawValue);
        if (!employee || !employeeId || !Number.isFinite(value) || value <= 0) continue;

        const isFixed = employee.payModel === "fixed";
        const plannedHours = isFixed ? null : value;
        const payAmount = isFixed ? Math.round(value) : Math.round(value * (employee.rate || 0));
        shiftCount += 1;
        await pool.query(
          `
            INSERT INTO schedule_shifts (
              work_date,
              employee_id,
              planned_hours,
              pay_amount,
              pay_model,
              created_by,
              updated_by
            )
            VALUES ($1::date, $2, $3, $4, $5, $6, $6)
            ON CONFLICT (work_date, employee_id) DO UPDATE
            SET planned_hours = excluded.planned_hours,
                pay_amount = excluded.pay_amount,
                pay_model = excluded.pay_model,
                updated_by = excluded.updated_by,
                updated_at = now()
          `,
          [date, employeeId, plannedHours, payAmount, employee.payModel, actorEmployeeId]
        );
      }
    }

    for (const [date, items] of Object.entries(backup.payouts || {})) {
      if (!isDateKey(date) || !Array.isArray(items)) continue;
      for (const item of items) {
        if (!item || typeof item !== "object") continue;
        const employeeId = employeeIdBySource.get(String((item as { employeeId?: unknown }).employeeId || ""));
        const amount = Number((item as { amount?: unknown }).amount);
        if (!employeeId || !Number.isFinite(amount) || amount <= 0) continue;
        payoutCount += 1;
        await pool.query(
          `
            INSERT INTO payroll_payouts (work_date, employee_id, amount, created_by)
            VALUES ($1::date, $2, $3, $4)
          `,
          [date, employeeId, Math.round(amount), actorEmployeeId]
        );
      }
    }

    for (const [date, row] of Object.entries(backup.scores || {})) {
      if (!isDateKey(date) || !row || typeof row !== "object") continue;
      for (const [sourceEmployeeId, rawScore] of Object.entries(row as Record<string, unknown>)) {
        const employeeId = employeeIdBySource.get(sourceEmployeeId);
        const score = toScore(rawScore);
        if (!employeeId || !score) continue;
        scoreCount += 1;
        await pool.query(
          `
            INSERT INTO employee_scores (work_date, employee_id, score, created_by)
            VALUES ($1::date, $2, $3::score_value, $4)
            ON CONFLICT (work_date, employee_id) DO UPDATE
            SET score = excluded.score,
                created_by = excluded.created_by,
                updated_at = now()
          `,
          [date, employeeId, score, actorEmployeeId]
        );
      }
    }

    await pool.query("COMMIT");
    return {
      ok: true,
      employees: employees.length,
      dates: dates.length,
      shifts: shiftCount,
      plannedPaydays: plannedPayCount,
      payouts: payoutCount,
      scores: scoreCount,
      deadlines: deadlineCount
    };
  } catch (error) {
    await pool.query("ROLLBACK");
    throw error;
  }
}

function normalizeEmployee(raw: Record<string, unknown>): ImportedEmployee | undefined {
  const id = String(raw.id || "").trim();
  const name = String(raw.name || raw.display_name || "").trim();
  if (!id || !name) return undefined;
  const role = normalizeScheduleRole(String(raw.role || "other"));
  const payModel = role === "dish" ? "fixed" : "hourly";
  return {
    id,
    name,
    role,
    hours: numberOrNull(raw.hours),
    rate: numberOrNull(raw.rate),
    payModel
  };
}

function normalizeScheduleRole(role: string): string {
  if (role === "dishwasher") return "dish";
  if (["cook", "bar", "waiter", "dish"].includes(role)) return role;
  return "other";
}

function toEmployeeRole(role: string): string {
  if (role === "dish") return "dishwasher";
  if (["cook", "bar", "waiter"].includes(role)) return role;
  return "other";
}

function collectBackupDates(backup: ImportedBackup): string[] {
  const dates = new Set<string>();
  [backup.shifts, backup.marks, backup.payouts, backup.scores].forEach((source) => {
    Object.keys(source || {}).forEach((date) => {
      if (isDateKey(date)) dates.add(date);
    });
  });
  return Array.from(dates).sort();
}

function readMark(raw: unknown): { task: boolean; pay: string[] } {
  if (!raw || typeof raw !== "object") return { task: false, pay: [] };
  const mark = raw as { task?: unknown; pay?: unknown };
  return {
    task: Boolean(mark.task),
    pay: Array.isArray(mark.pay) ? mark.pay.map(String).filter(Boolean) : []
  };
}

function numberOrNull(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function toScore(value: unknown): "green" | "yellow" | "red" | undefined {
  if (value === "g" || value === "green") return "green";
  if (value === "y" || value === "yellow") return "yellow";
  if (value === "r" || value === "red") return "red";
  return undefined;
}

function isDateKey(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function buildMonthDays(year: number, month: number): string[] {
  const last = new Date(year, month, 0).getDate();
  return Array.from({ length: last }, (_, index) => `${year}-${String(month).padStart(2, "0")}-${String(index + 1).padStart(2, "0")}`);
}

function planRange(fot: number): string {
  if (!fot) return "0";
  return `${shortK(fot / 0.28)}-${shortK(fot / 0.23)}`;
}

function shortK(value: number): string {
  return `${Math.round(value / 1000)}к`;
}
