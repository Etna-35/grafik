import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { requireUser, type SessionUser } from "./auth.js";
import { query } from "./db.js";
import { predictRevenue } from "./finance.js";

// Касса — планировщик cash-flow. Раздел строго owner. См. docs/treasury-planner.md.
// Фаза 1: остаток + ставки, конверты закуп/хоз (накопление от факта с переносом),
// факт трат, точки платежей с расчётом покрытия (копилки) и флагом обеспеченности.

const PAYMENT_CATEGORIES = ["ЖКХ", "Аренда", "Налог", "Долг", "Закуп", "Прочее"] as const;

function isOwner(user: SessionUser): boolean {
  return user.role === "owner";
}

async function requireOwner(request: FastifyRequest, reply: FastifyReply): Promise<SessionUser | undefined> {
  const user = await requireUser(request, reply);
  if (!user) return undefined;
  if (!isOwner(user)) {
    await reply.code(403).send({ error: "forbidden" });
    return undefined;
  }
  return user;
}

function mskToday(): string {
  const d = new Date(Date.now() + 3 * 60 * 60 * 1000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function isoOf(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function daysBetween(fromIso: string, toIso: string): number {
  const a = Date.parse(`${fromIso}T00:00:00Z`);
  const b = Date.parse(`${toIso}T00:00:00Z`);
  return Math.round((b - a) / 86400000);
}

type Settings = { purchasePct: number; householdPct: number; safetyBuffer: number; accrualStart: string };

async function loadSettings(): Promise<Settings> {
  const r = await query<{ purchase_pct: string; household_pct: string; safety_buffer: string; accrual_start: string }>(
    "SELECT purchase_pct, household_pct, safety_buffer, accrual_start::text FROM treasury_settings WHERE id = 1"
  );
  const row = r.rows[0];
  return {
    purchasePct: Number(row?.purchase_pct ?? 30),
    householdPct: Number(row?.household_pct ?? 5),
    safetyBuffer: Number(row?.safety_buffer ?? 0),
    accrualStart: row?.accrual_start ?? mskToday().slice(0, 8) + "01"
  };
}

// Средняя выручка по дням недели (для прогноза будущих дней). dow: 0=вс..6=сб.
async function weekdayAvg(beforeIso: string): Promise<Map<number, number>> {
  const r = await query<{ dow: number; avg: number }>(
    `SELECT EXTRACT(DOW FROM work_date)::int AS dow, AVG(revenue_total)::float AS avg
     FROM shift_closings WHERE work_date < $1::date AND revenue_total > 0 GROUP BY 1`,
    [beforeIso]
  );
  const m = new Map<number, number>();
  for (const row of r.rows) m.set(Number(row.dow), Number(row.avg || 0));
  return m;
}

async function computeState() {
  const today = mskToday();
  const settings = await loadSettings();

  const balRow = await query<{ balance: string; as_of: string; note: string }>(
    "SELECT balance, as_of::text, note FROM treasury_balance ORDER BY as_of DESC, created_at DESC LIMIT 1"
  );
  const balance = balRow.rows[0] ? Number(balRow.rows[0].balance) : 0;
  const balanceAsOf = balRow.rows[0]?.as_of ?? null;

  // --- Конверты: накопление от ФАКТА выручки с accrual_start, минус факт трат категории ---
  const revRow = await query<{ total: string }>(
    "SELECT COALESCE(SUM(revenue_total), 0)::text AS total FROM shift_closings WHERE work_date >= $1::date AND work_date <= $2::date",
    [settings.accrualStart, today]
  );
  const revenueSinceStart = Number(revRow.rows[0]?.total || 0);
  const todayRevRow = await query<{ total: string }>(
    "SELECT COALESCE(SUM(revenue_total), 0)::text AS total FROM shift_closings WHERE work_date = $1::date",
    [today]
  );
  const todayRevenue = Number(todayRevRow.rows[0]?.total || 0);

  const spendRows = await query<{ kind: string; total: string }>(
    "SELECT kind, COALESCE(SUM(amount), 0)::text AS total FROM treasury_spend WHERE spent_on >= $1::date GROUP BY kind",
    [settings.accrualStart]
  );
  const spentByKind = new Map<string, number>();
  for (const row of spendRows.rows) spentByKind.set(row.kind, Number(row.total || 0));

  const purchaseAccrued = Math.round((revenueSinceStart * settings.purchasePct) / 100);
  const householdAccrued = Math.round((revenueSinceStart * settings.householdPct) / 100);
  const envelopes = {
    purchase: {
      accrued: purchaseAccrued,
      spent: Math.round(spentByKind.get("food") || 0),
      available: Math.round(purchaseAccrued - (spentByKind.get("food") || 0)),
      todayAccrual: Math.round((todayRevenue * settings.purchasePct) / 100),
      pct: settings.purchasePct
    },
    household: {
      accrued: householdAccrued,
      spent: Math.round(spentByKind.get("household") || 0),
      available: Math.round(householdAccrued - (spentByKind.get("household") || 0)),
      todayAccrual: Math.round((todayRevenue * settings.householdPct) / 100),
      pct: settings.householdPct
    }
  };

  // --- Платежи + покрытие (копилки) ---
  const payRows = await query<{
    id: string; title: string; amount: string; due_date: string; category: string;
    priority: number; splittable: boolean; status: string;
  }>(
    `SELECT id::text, title, amount, due_date::text, category, priority, splittable, status
     FROM treasury_payments WHERE status <> 'paid' ORDER BY due_date, priority`
  );

  // Прогноз дневного свободного потока (FCF) до самого дальнего платежа.
  const opPct = (settings.purchasePct + settings.householdPct) / 100;
  const wavg = await weekdayAvg(today);
  const fotRows = await query<{ d: string; fot: string }>(
    `SELECT work_date::text AS d, COALESCE(SUM(pay_amount), 0)::text AS fot
     FROM schedule_shifts WHERE work_date > $1::date GROUP BY work_date`,
    [today]
  );
  const fotByDate = new Map<string, number>();
  for (const row of fotRows.rows) fotByDate.set(row.d, Number(row.fot || 0));

  const maxDue = payRows.rows.reduce((acc, p) => (p.due_date > acc ? p.due_date : acc), today);
  // Кумулятивный FCF по датам (с завтрашнего дня; +120 дней за горизонт — для подсказок «перенести»).
  const cumFcfByDate = new Map<string, number>();
  const fcfSeries: Array<{ iso: string; cum: number }> = [];
  let cum = 0;
  const start = new Date(`${today}T00:00:00Z`);
  const horizonDays = Math.max(0, daysBetween(today, maxDue)) + 120;
  for (let i = 1; i <= horizonDays; i++) {
    const d = new Date(start.getTime() + i * 86400000);
    const iso = isoOf(d);
    const rev = Math.round(wavg.get(d.getUTCDay()) || 0);
    const fot = fotByDate.get(iso) || 0;
    const fcf = Math.round(rev - fot - rev * opPct);
    cum += fcf;
    cumFcfByDate.set(iso, cum);
    fcfSeries.push({ iso, cum });
  }
  const cumUpTo = (iso: string): number => {
    if (iso <= today) return 0;
    if (cumFcfByDate.has(iso)) return cumFcfByDate.get(iso) as number;
    // ближайшая известная дата <= iso
    let best = 0;
    for (const [k, v] of cumFcfByDate) if (k <= iso && v !== undefined) best = v;
    return best;
  };

  // Стартовый резерв "сейчас": остаток минус подушка и неизрасходованные конверты.
  const reservableNow = Math.round(balance - settings.safetyBuffer - envelopes.purchase.available - envelopes.household.available);

  // Пас A: покрытие ТОЛЬКО текущим резервом (без будущего FCF) — основа для "сколько откладывать в день".
  let poolNow = Math.max(0, reservableNow);
  const coveredNowList = payRows.rows.map((p) => {
    const c = Math.max(0, Math.min(Number(p.amount), poolNow));
    poolNow -= c;
    return c;
  });

  // Пас B: покрытие с учётом прогнозного FCF до срока — для статуса/копилки.
  let consumed = 0;
  let todayEarmark = 0;
  const payments = payRows.rows.map((p, i) => {
    const amount = Number(p.amount);
    const daysLeft = Math.max(1, daysBetween(today, p.due_date));
    const consumedBefore = consumed;
    const availableByDue = reservableNow + cumUpTo(p.due_date) - consumedBefore;
    const coverage = Math.max(0, Math.min(amount, Math.round(availableByDue)));
    consumed += coverage;
    const shortfall = Math.round(amount - coverage);
    const pctCovered = amount > 0 ? Math.round((coverage / amount) * 100) : 100;
    let statusFlag: "ok" | "tight" | "risk";
    if (coverage >= amount) statusFlag = "ok";
    else if (pctCovered >= 80) statusFlag = "tight";
    else statusFlag = "risk";
    const uncoveredNow = Math.max(0, amount - coveredNowList[i]);
    const perDay = Math.ceil(uncoveredNow / daysLeft);
    todayEarmark += perDay;

    // Подсказки при нехватке: перенести (ближайшая обеспеченная дата) / сплит / урезать.
    let suggestions: undefined | {
      moveToDate: string | null;
      splittable: boolean;
      splitNow: number;
      splitLater: number;
      splitLaterDate: string | null;
      reduce: Array<{ title: string; amount: number }>;
    };
    if (statusFlag !== "ok") {
      const feasible = fcfSeries.find((s) => s.iso > p.due_date && reservableNow + s.cum - consumedBefore >= amount);
      const moveToDate = feasible ? feasible.iso : null;
      const reduce = payRows.rows
        .filter((q, j) => j !== i && q.due_date <= p.due_date)
        .slice(0, 3)
        .map((q) => ({ title: q.title, amount: Number(q.amount) }));
      suggestions = {
        moveToDate,
        splittable: p.splittable,
        splitNow: coverage,
        splitLater: shortfall,
        splitLaterDate: moveToDate,
        reduce
      };
    }

    return {
      id: p.id,
      title: p.title,
      amount,
      dueDate: p.due_date,
      category: p.category,
      priority: p.priority,
      splittable: p.splittable,
      coverage,
      shortfall,
      pctCovered,
      statusFlag,
      perDay,
      suggestions
    };
  });

  // Свободно сегодня = дневной свободный поток − рекомендованные отчисления.
  const todayDow = new Date(`${today}T00:00:00Z`).getUTCDay();
  const todayFotRow = await query<{ fot: string }>(
    "SELECT COALESCE(SUM(pay_amount), 0)::text AS fot FROM schedule_shifts WHERE work_date = $1::date",
    [today]
  );
  const todayFot = Number(todayFotRow.rows[0]?.fot || 0);
  const todayRev = todayRevenue > 0 ? todayRevenue : Math.round(wavg.get(todayDow) || 0);
  const todayFcf = Math.round(todayRev - todayFot - todayRev * opPct);
  const freeToday = Math.round(todayFcf - todayEarmark);

  // Распределение прогноза месяца по корзинам (для полосы).
  const [yy, mm] = today.split("-").map(Number);
  const ym = `${yy}-${String(mm).padStart(2, "0")}`;
  const monthRev = (await predictRevenue(yy, mm)).predicted;
  const monthFotRow = await query<{ fot: string }>(
    "SELECT COALESCE(SUM(pay_amount), 0)::text AS fot FROM schedule_shifts WHERE work_date >= $1::date AND work_date < ($1::date + interval '1 month')",
    [`${ym}-01`]
  );
  const monthFot = Number(monthFotRow.rows[0]?.fot || 0);
  const purchaseAlloc = Math.round((monthRev * settings.purchasePct) / 100);
  const householdAlloc = Math.round((monthRev * settings.householdPct) / 100);
  const reserveAlloc = Math.round(
    payRows.rows.filter((p) => p.due_date.slice(0, 7) === ym).reduce((s, p) => s + Number(p.amount), 0)
  );
  const freeAlloc = Math.max(0, Math.round(monthRev - monthFot - purchaseAlloc - householdAlloc - reserveAlloc));
  const allocation = {
    revenue: monthRev,
    fot: monthFot,
    purchase: purchaseAlloc,
    household: householdAlloc,
    reserve: reserveAlloc,
    free: freeAlloc
  };

  return { today, balance, balanceAsOf, settings, envelopes, payments, freeToday, todayEarmark, allocation };
}

const balanceSchema = z.object({
  balance: z.number().min(0).max(1_000_000_000),
  asOf: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  note: z.string().trim().max(200).optional().default("")
});
const settingsSchema = z.object({
  purchasePct: z.number().min(0).max(100),
  householdPct: z.number().min(0).max(100),
  safetyBuffer: z.number().min(0).max(1_000_000_000),
  accrualStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
});
const paymentSchema = z.object({
  title: z.string().trim().min(1).max(120),
  amount: z.number().positive().max(1_000_000_000),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  category: z.enum(PAYMENT_CATEGORIES as unknown as [string, ...string[]]).optional().default("Прочее"),
  priority: z.number().int().min(0).max(1000).optional().default(100),
  splittable: z.boolean().optional().default(true)
});
const spendSchema = z.object({
  kind: z.enum(["food", "household", "personal", "other"]),
  amount: z.number().positive().max(1_000_000_000),
  spentOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  note: z.string().trim().max(200).optional().default("")
});
const idParam = z.object({ id: z.string().uuid() });
const splitSchema = z.object({
  nowAmount: z.number().min(0).max(1_000_000_000),
  laterAmount: z.number().positive().max(1_000_000_000),
  laterDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
});

export function registerTreasuryRoutes(app: FastifyInstance): void {
  app.get("/api/treasury", async (request, reply) => {
    const user = await requireOwner(request, reply);
    if (!user) return;
    return computeState();
  });

  app.post("/api/treasury/balance", async (request, reply) => {
    const user = await requireOwner(request, reply);
    if (!user) return;
    const body = balanceSchema.parse(request.body);
    await query(
      "INSERT INTO treasury_balance (balance, as_of, note) VALUES ($1, $2, $3)",
      [body.balance, body.asOf ?? mskToday(), body.note]
    );
    return computeState();
  });

  app.put("/api/treasury/settings", async (request, reply) => {
    const user = await requireOwner(request, reply);
    if (!user) return;
    const body = settingsSchema.parse(request.body);
    await query(
      `UPDATE treasury_settings
       SET purchase_pct = $1, household_pct = $2, safety_buffer = $3,
           accrual_start = COALESCE($4::date, accrual_start), updated_at = now()
       WHERE id = 1`,
      [body.purchasePct, body.householdPct, body.safetyBuffer, body.accrualStart ?? null]
    );
    return computeState();
  });

  app.post("/api/treasury/payments", async (request, reply) => {
    const user = await requireOwner(request, reply);
    if (!user) return;
    const body = paymentSchema.parse(request.body);
    await query(
      `INSERT INTO treasury_payments (title, amount, due_date, category, priority, splittable)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [body.title, body.amount, body.dueDate, body.category, body.priority, body.splittable]
    );
    return computeState();
  });

  app.put("/api/treasury/payments/:id", async (request, reply) => {
    const user = await requireOwner(request, reply);
    if (!user) return;
    const { id } = idParam.parse(request.params);
    const body = paymentSchema.parse(request.body);
    await query(
      `UPDATE treasury_payments
       SET title = $1, amount = $2, due_date = $3, category = $4, priority = $5, splittable = $6
       WHERE id = $7`,
      [body.title, body.amount, body.dueDate, body.category, body.priority, body.splittable, id]
    );
    return computeState();
  });

  app.post("/api/treasury/payments/:id/pay", async (request, reply) => {
    const user = await requireOwner(request, reply);
    if (!user) return;
    const { id } = idParam.parse(request.params);
    await query("UPDATE treasury_payments SET status = 'paid', paid_at = now() WHERE id = $1", [id]);
    return computeState();
  });

  app.post("/api/treasury/payments/:id/split", async (request, reply) => {
    const user = await requireOwner(request, reply);
    if (!user) return;
    const { id } = idParam.parse(request.params);
    const body = splitSchema.parse(request.body);
    const orig = await query<{ title: string; category: string; priority: number; splittable: boolean }>(
      "SELECT title, category, priority, splittable FROM treasury_payments WHERE id = $1",
      [id]
    );
    if (!orig.rows[0]) {
      await reply.code(404).send({ error: "not_found" });
      return;
    }
    await query("UPDATE treasury_payments SET amount = $1 WHERE id = $2", [body.nowAmount, id]);
    await query(
      `INSERT INTO treasury_payments (title, amount, due_date, category, priority, splittable, parent_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [`${orig.rows[0].title} (остаток)`, body.laterAmount, body.laterDate, orig.rows[0].category, orig.rows[0].priority, orig.rows[0].splittable, id]
    );
    return computeState();
  });

  app.delete("/api/treasury/payments/:id", async (request, reply) => {
    const user = await requireOwner(request, reply);
    if (!user) return;
    const { id } = idParam.parse(request.params);
    await query("DELETE FROM treasury_payments WHERE id = $1", [id]);
    return computeState();
  });

  app.post("/api/treasury/spend", async (request, reply) => {
    const user = await requireOwner(request, reply);
    if (!user) return;
    const body = spendSchema.parse(request.body);
    await query(
      "INSERT INTO treasury_spend (kind, amount, spent_on, note) VALUES ($1, $2, $3, $4)",
      [body.kind, body.amount, body.spentOn ?? mskToday(), body.note]
    );
    return computeState();
  });

  app.delete("/api/treasury/spend/:id", async (request, reply) => {
    const user = await requireOwner(request, reply);
    if (!user) return;
    const { id } = idParam.parse(request.params);
    await query("DELETE FROM treasury_spend WHERE id = $1", [id]);
    return computeState();
  });
}
