import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { requireUser, type SessionUser } from "./auth.js";
import { query } from "./db.js";
import { predictRevenue } from "./finance.js";

// «Деньги» — владельческий экран вместо «Кассы» (docs/money-page.md).
// Принцип: НОЛЬ ежедневного ручного ввода. Всё считается из данных, которые и так приходят:
// закрытия смен (выручка, наличные траты), график (ФОТ), finance_fixed (постоянные платежи).
// Руками — только раз в месяц: цифра закупа + список обязательных платежей.
// Касса (treasury.ts) не удалена: платежи живут в той же таблице treasury_payments.

const PURCHASE_NORM_PCT = 30; // норматив закупа, пока владелец не ввёл факт месяца (помечаем «оценка»)
// Статьи finance_fixed, которые НЕ считаем «постоянными»: это закуп, он приходит отдельной цифрой.
const FIXED_SKIP = new Set(["food", "bar", "household"]);
const FIXED_LABELS: Record<string, string> = {
  rent: "Аренда",
  utilities: "ЖКХ",
  software: "ПО и сервисы",
  accounting: "Бухгалтерия",
  marketing: "Маркетинг",
  repair: "Ремонт",
  other: "Прочее"
};
const RU_MONTHS = ["январь", "февраль", "март", "апрель", "май", "июнь", "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь"];

function mskToday(): string {
  const d = new Date(Date.now() + 3 * 60 * 60 * 1000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function monthStart(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

function monthEnd(year: number, month: number): string {
  const d = new Date(Date.UTC(year, month, 0));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const d = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
}

async function requireOwner(request: FastifyRequest, reply: FastifyReply): Promise<SessionUser | undefined> {
  const user = await requireUser(request, reply);
  if (!user) return undefined;
  if (user.role !== "owner") {
    await reply.code(403).send({ error: "forbidden" });
    return undefined;
  }
  return user;
}

// Выручка месяца: факт по закрытиям + сколько дней реально закрыто (для темпа ₽/день).
async function revenueOfMonth(year: number, month: number) {
  const r = await query<{ total: string; days: string; cash: string }>(
    `SELECT COALESCE(SUM(revenue_total), 0)::text AS total,
            COUNT(*) FILTER (WHERE revenue_total > 0)::text AS days,
            COALESCE(SUM(cash_revenue), 0)::text AS cash
     FROM shift_closings WHERE work_date >= $1::date AND work_date <= $2::date`,
    [monthStart(year, month), monthEnd(year, month)]
  );
  const total = Number(r.rows[0]?.total || 0);
  const days = Number(r.rows[0]?.days || 0);
  return { total, days, cash: Number(r.rows[0]?.cash || 0), perDay: days > 0 ? Math.round(total / days) : 0 };
}

// Прочие поступления месяца (finance_income): корпоративы, коррекции незакрытых смен и т.п.
// Они входят в выручку МЕСЯЦА, но НЕ в темп ₽/день — это разовые деньги, они задрали бы средние.
async function otherIncomeOfMonth(year: number, month: number) {
  const r = await query<{ total: string; items: string }>(
    `SELECT COALESCE(SUM(amount), 0)::text AS total, COUNT(*)::text AS items
     FROM finance_income WHERE entry_date >= $1::date AND entry_date <= $2::date`,
    [monthStart(year, month), monthEnd(year, month)]
  );
  return { total: Number(r.rows[0]?.total || 0), items: Number(r.rows[0]?.items || 0) };
}

// Наличные траты из закрытий смен (мойка / такси / доп. расходы) + выплаты кальянщикам.
async function shiftCostsOfMonth(year: number, month: number) {
  const r = await query<{ wash: string; taxi: string; extra: string; hookah: string }>(
    `SELECT COALESCE(SUM(wash_cost), 0)::text AS wash,
            COALESCE(SUM(taxi_amount), 0)::text AS taxi,
            COALESCE(SUM(extra_expenses_total), 0)::text AS extra,
            COALESCE(SUM(hookah_payout), 0)::text AS hookah
     FROM shift_closings WHERE work_date >= $1::date AND work_date <= $2::date`,
    [monthStart(year, month), monthEnd(year, month)]
  );
  const row = r.rows[0];
  return {
    wash: Number(row?.wash || 0),
    taxi: Number(row?.taxi || 0),
    extra: Number(row?.extra || 0),
    hookah: Number(row?.hookah || 0)
  };
}

// ФОТ месяца — начислено по графику (schedule_shifts.pay_amount), т.е. то, что заработали за месяц.
async function payrollAccrued(year: number, month: number): Promise<number> {
  const r = await query<{ total: string }>(
    `SELECT COALESCE(SUM(pay_amount), 0)::text AS total
     FROM schedule_shifts WHERE work_date >= $1::date AND work_date <= $2::date`,
    [monthStart(year, month), monthEnd(year, month)]
  );
  return Math.round(Number(r.rows[0]?.total || 0));
}

// Остаток по ЗП за месяц — ТОЙ ЖЕ формулой, что «Осталось выплатить» в графике (schedule.ts):
// по каждому сотруднику max(0, смены + премии за задачи + цели продаж + кэш-серии − выплачено),
// и только потом сумма. Клампим на уровне сотрудника, поэтому переплата одному (например, полный
// расчёт при увольнении) НЕ гасит долг перед остальными. Кальяны и чаевые в остаток не входят —
// они выдаются сразу. Выплаты относим по apply_month (выплата в июле за июнь считается в июне).
async function salaryOwed(year: number, month: number): Promise<number> {
  const start = monthStart(year, month);
  const r = await query<{ total: string }>(
    `WITH acc AS (
       SELECT employee_id, SUM(pay_amount)::int AS v FROM schedule_shifts
       WHERE work_date >= $1::date AND work_date < ($1::date + interval '1 month') GROUP BY 1
     ), task AS (
       SELECT employee_id, SUM(reward_amount)::int AS v FROM tasks
       WHERE status = 'done' AND approved_at IS NOT NULL AND reward_amount > 0
         AND approved_at >= $1::date AND approved_at < ($1::date + interval '1 month') GROUP BY 1
     ), goal AS (
       SELECT employee_id, SUM(reward_amount)::int AS v FROM sales_goals
       WHERE status = 'confirmed' AND reward_amount > 0
         AND confirmed_at >= $1::date AND confirmed_at < ($1::date + interval '1 month') GROUP BY 1
     ), streak AS (
       SELECT employee_id, SUM(bonus_amount)::int AS v FROM cash_streak_awards
       WHERE streak_end_date >= $1::date AND streak_end_date < ($1::date + interval '1 month') GROUP BY 1
     ), paid AS (
       -- только зарплатные выплаты: гашение личных обязательств (obligation_id) — отдельный долг
       SELECT employee_id, SUM(amount)::int AS v FROM payroll_payouts
       WHERE obligation_id IS NULL
         AND COALESCE(apply_month, date_trunc('month', work_date)::date) >= $1::date
         AND COALESCE(apply_month, date_trunc('month', work_date)::date) < ($1::date + interval '1 month')
       GROUP BY 1
     ), emp AS (
       SELECT employee_id FROM acc
       UNION SELECT employee_id FROM task
       UNION SELECT employee_id FROM goal
       UNION SELECT employee_id FROM streak
       UNION SELECT employee_id FROM paid
     )
     SELECT COALESCE(SUM(GREATEST(0,
       COALESCE(acc.v,0) + COALESCE(task.v,0) + COALESCE(goal.v,0) + COALESCE(streak.v,0) - COALESCE(paid.v,0)
     )), 0)::text AS total
     FROM emp
     LEFT JOIN acc USING (employee_id) LEFT JOIN task USING (employee_id)
     LEFT JOIN goal USING (employee_id) LEFT JOIN streak USING (employee_id)
     LEFT JOIN paid USING (employee_id)`,
    [start]
  );
  return Math.round(Number(r.rows[0]?.total || 0));
}

async function fixedPayments(): Promise<{ items: Array<{ article: string; label: string; amount: number }>; total: number }> {
  const r = await query<{ article: string; amount: number }>("SELECT article, amount FROM finance_fixed ORDER BY amount DESC");
  const items = r.rows
    .filter((row) => !FIXED_SKIP.has(row.article) && Number(row.amount) > 0)
    .map((row) => ({ article: row.article, label: FIXED_LABELS[row.article] || row.article, amount: Number(row.amount) }));
  return { items, total: items.reduce((s, i) => s + i.amount, 0) };
}

async function salaryClosed(year: number, month: number): Promise<boolean> {
  const r = await query<{ salary_closed: boolean }>(
    "SELECT salary_closed FROM money_month_facts WHERE month = $1::date",
    [monthStart(year, month)]
  );
  return Boolean(r.rows[0]?.salary_closed);
}

async function purchaseOfMonth(year: number, month: number, predictedRevenue: number) {
  const r = await query<{ purchase_amount: number | null }>(
    "SELECT purchase_amount FROM money_month_facts WHERE month = $1::date",
    [monthStart(year, month)]
  );
  const fact = r.rows[0]?.purchase_amount ?? null;
  if (fact !== null) return { amount: Math.round(Number(fact)), isEstimate: false, normPct: PURCHASE_NORM_PCT };
  return { amount: Math.round((predictedRevenue * PURCHASE_NORM_PCT) / 100), isEstimate: true, normPct: PURCHASE_NORM_PCT };
}

// Ближайшие обязательные платежи: ЗП за прошлый месяц (к 10-му) + точки платежей владельца.
async function upcomingPayments(year: number, month: number, today: string) {
  const prev = shiftMonth(year, month, -1);
  const list: Array<{ id: string; title: string; amount: number; dueDate: string; category: string; isSalary: boolean; overdue: boolean }> = [];

  const owed = (await salaryClosed(prev.year, prev.month)) ? 0 : await salaryOwed(prev.year, prev.month);
  if (owed > 0) {
    // Срок по ЗП — конец текущего месяца, без конкретной даты и без «просрочен»:
    // задача владельца — закрыть прошлый месяц до конца текущего, а не к 10-му числу.
    list.push({
      id: `salary-${prev.year}-${prev.month}`,
      title: `ЗП за ${RU_MONTHS[prev.month - 1]}`,
      amount: owed,
      dueDate: monthEnd(year, month),
      category: "ЗП",
      isSalary: true,
      overdue: false
    });
  }

  const r = await query<{ id: string; title: string; amount: string; due_date: string; category: string }>(
    `SELECT id::text, title, amount, due_date::text, category FROM treasury_payments
     WHERE status <> 'paid' AND due_date <= $1::date ORDER BY due_date`,
    [monthEnd(year, month)]
  );
  for (const row of r.rows) {
    list.push({
      id: row.id,
      title: row.title,
      amount: Math.round(Number(row.amount)),
      dueDate: row.due_date,
      category: row.category,
      isSalary: false,
      overdue: row.due_date < today
    });
  }

  list.sort((a, b) => (a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : 0));
  return list;
}

// exported для быстрой проверки цифр из контейнера (node -e), без сессии владельца
export async function computeMoney(year: number, month: number) {
  const today = mskToday();
  const isCurrentMonth = `${year}-${String(month).padStart(2, "0")}` === today.slice(0, 7);

  const forecast = await predictRevenue(year, month);
  const revenue = await revenueOfMonth(year, month);
  const prev = shiftMonth(year, month, -1);
  const prevRevenue = await revenueOfMonth(prev.year, prev.month);

  const [fot, shiftCosts, fixed, payments, otherIncome] = await Promise.all([
    payrollAccrued(year, month),
    shiftCostsOfMonth(year, month),
    fixedPayments(),
    upcomingPayments(year, month, today),
    otherIncomeOfMonth(year, month)
  ]);
  // Выручка месяца = закрытия смен + прочие поступления (корпоративы и пр., миграция 048).
  const factTotal = revenue.total + otherIncome.total;
  const predictedTotal = forecast.predicted + otherIncome.total;
  const purchase = await purchaseOfMonth(year, month, predictedTotal);

  // Темп: ₽ в день по факту, против прошлого месяца. Главный сигнал экрана.
  const paceDeltaPct = prevRevenue.perDay > 0 && revenue.perDay > 0
    ? Math.round(((revenue.perDay - prevRevenue.perDay) / prevRevenue.perDay) * 100)
    : null;

  // Прибыль месяца: выручка (факт + прогноз до конца месяца) минус расходы.
  // Всё расписано строками, чтобы владелец видел, из чего сложилось, и мог не верить на слово.
  const revenueForProfit = isCurrentMonth ? predictedTotal : factTotal;
  const costs = [
    { key: "fot", label: "ФОТ по графику", amount: fot },
    { key: "hookah", label: "Кальянщики", amount: shiftCosts.hookah },
    { key: "purchase", label: purchase.isEstimate ? `Закуп (оценка ${purchase.normPct}%)` : "Закуп (факт)", amount: purchase.amount },
    { key: "fixed", label: "Постоянные платежи", amount: fixed.total },
    { key: "wash", label: "Мойка", amount: shiftCosts.wash },
    { key: "taxi", label: "Такси", amount: shiftCosts.taxi },
    { key: "extra", label: "Доп. расходы смен", amount: shiftCosts.extra }
  ].filter((c) => c.amount > 0);
  const costsTotal = costs.reduce((s, c) => s + c.amount, 0);
  const profit = Math.round(revenueForProfit - costsTotal);

  // «Хватит ли»: сколько выручки ещё придёт до конца месяца против того, что надо заплатить.
  const revenueLeft = Math.max(0, Math.round(forecast.predicted - revenue.total));
  const prevSalaryClosed = await salaryClosed(...(() => { const p = shiftMonth(year, month, -1); return [p.year, p.month] as [number, number]; })());
  const paymentsTotal = payments.reduce((s, p) => s + p.amount, 0);

  return {
    today,
    year,
    month,
    monthLabel: RU_MONTHS[month - 1],
    isCurrentMonth,
    revenue: {
      fact: factTotal,
      shifts: revenue.total,
      other: otherIncome.total,
      otherItems: otherIncome.items,
      cash: revenue.cash,
      days: revenue.days,
      perDay: revenue.perDay,
      predicted: predictedTotal,
      left: revenueLeft,
      daysInMonth: forecast.daysInMonth
    },
    pace: {
      perDay: revenue.perDay,
      prevPerDay: prevRevenue.perDay,
      prevLabel: RU_MONTHS[prev.month - 1],
      deltaPct: paceDeltaPct
    },
    profit,
    profitIsForecast: isCurrentMonth,
    prevMonthLabel: RU_MONTHS[shiftMonth(year, month, -1).month - 1],
    salaryClosed: prevSalaryClosed,
    costs,
    costsTotal,
    purchase: { amount: purchase.amount, isEstimate: purchase.isEstimate, normPct: purchase.normPct },
    fixed: fixed.items,
    payments,
    paymentsTotal,
    afterPayments: Math.round(revenueLeft - paymentsTotal)
  };
}

const monthQuery = z.object({
  year: z.coerce.number().int().min(2024).max(2100).optional(),
  month: z.coerce.number().int().min(1).max(12).optional()
});
const purchaseSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  amount: z.number().int().min(0).max(1_000_000_000).nullable()
});
const salaryClosedSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),   // месяц, ЗА который закрываем зарплату
  closed: z.boolean()
});
const paymentSchema = z.object({
  title: z.string().trim().min(1).max(120),
  amount: z.number().positive().max(1_000_000_000),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  category: z.string().trim().max(40).optional().default("Прочее"),
  recurring: z.enum(["none", "monthly"]).optional().default("none")
});
const idParam = z.object({ id: z.string().uuid() });

export function registerMoneyRoutes(app: FastifyInstance): void {
  app.get("/api/money", async (request, reply) => {
    const user = await requireOwner(request, reply);
    if (!user) return;
    const q = monthQuery.parse(request.query);
    const today = mskToday();
    const year = q.year ?? Number(today.slice(0, 4));
    const month = q.month ?? Number(today.slice(5, 7));
    return computeMoney(year, month);
  });

  // Закуп за месяц — единственный ручной ввод экрана (раз в месяц, одной цифрой).
  app.put("/api/money/purchase", async (request, reply) => {
    const user = await requireOwner(request, reply);
    if (!user) return;
    const body = purchaseSchema.parse(request.body);
    const [y, m] = body.month.split("-").map(Number);
    if (body.amount === null) {
      await query("DELETE FROM money_month_facts WHERE month = $1::date", [monthStart(y, m)]);
    } else {
      await query(
        `INSERT INTO money_month_facts (month, purchase_amount, updated_by, updated_at)
         VALUES ($1::date, $2, $3, now())
         ON CONFLICT (month) DO UPDATE SET purchase_amount = excluded.purchase_amount,
                                           updated_by = excluded.updated_by, updated_at = now()`,
        [monthStart(y, m), body.amount, user.id]
      );
    }
    return computeMoney(y, m);
  });

  // «ЗП за <месяц> закрыта» — убрать строку ЗП с экрана (в «Выплатах» остаток остаётся как есть).
  app.put("/api/money/salary-closed", async (request, reply) => {
    const user = await requireOwner(request, reply);
    if (!user) return;
    const body = salaryClosedSchema.parse(request.body);
    const [y, m] = body.month.split("-").map(Number);
    await query(
      `INSERT INTO money_month_facts (month, salary_closed, updated_by, updated_at)
       VALUES ($1::date, $2, $3, now())
       ON CONFLICT (month) DO UPDATE SET salary_closed = excluded.salary_closed,
                                         updated_by = excluded.updated_by, updated_at = now()`,
      [monthStart(y, m), body.closed, user.id]
    );
    const next = shiftMonth(y, m, 1);
    return computeMoney(next.year, next.month);
  });

  // Обязательные платежи живут в treasury_payments (та же таблица, что была у Кассы).
  app.post("/api/money/payments", async (request, reply) => {
    const user = await requireOwner(request, reply);
    if (!user) return;
    const body = paymentSchema.parse(request.body);
    await query(
      `INSERT INTO treasury_payments (title, amount, due_date, category, recurring)
       VALUES ($1, $2, $3, $4, $5)`,
      [body.title, body.amount, body.dueDate, body.category, body.recurring]
    );
    const [y, m] = body.dueDate.split("-").map(Number);
    return computeMoney(y, m);
  });

  app.post("/api/money/payments/:id/pay", async (request, reply) => {
    const user = await requireOwner(request, reply);
    if (!user) return;
    const { id } = idParam.parse(request.params);
    await query("UPDATE treasury_payments SET status = 'paid', paid_at = now() WHERE id = $1", [id]);
    // Ежемесячный платёж при оплате сразу создаёт себя на следующий месяц.
    await query(
      `INSERT INTO treasury_payments (title, amount, due_date, category, priority, splittable, recurring)
       SELECT title, amount, (due_date + interval '1 month')::date, category, priority, splittable, recurring
       FROM treasury_payments WHERE id = $1 AND recurring = 'monthly'`,
      [id]
    );
    const today = mskToday();
    return computeMoney(Number(today.slice(0, 4)), Number(today.slice(5, 7)));
  });

  app.delete("/api/money/payments/:id", async (request, reply) => {
    const user = await requireOwner(request, reply);
    if (!user) return;
    const { id } = idParam.parse(request.params);
    await query("DELETE FROM treasury_payments WHERE id = $1", [id]);
    const today = mskToday();
    return computeMoney(Number(today.slice(0, 4)), Number(today.slice(5, 7)));
  });
}
