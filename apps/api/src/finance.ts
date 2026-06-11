import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { requireUser, type SessionUser } from "./auth.js";
import { query } from "./db.js";

// Статьи P&L: ключ, метка, норма % от выручки, источник.
// source: "expense" — вводится вручную (расходы/постоянные), "calendar" — ФОТ из графика.
const ARTICLES = [
  { key: "food", label: "Food Cost (продукты)", norm: 28, source: "expense" },
  { key: "bar", label: "Бар-кост (напитки)", norm: 15, source: "expense" },
  { key: "household", label: "Хоз. материалы", norm: 1.8, source: "expense" },
  { key: "fot", label: "ФОТ с налогами", norm: 22, source: "calendar" },
  { key: "rent", label: "Аренда", norm: 8, source: "expense" },
  { key: "utilities", label: "Коммунальные", norm: 3, source: "expense" },
  { key: "marketing", label: "Маркетинг", norm: 2, source: "expense" },
  { key: "accounting", label: "Бухгалтерия / юр.", norm: 1, source: "expense" },
  { key: "software", label: "Интернет / связь / ПО", norm: 0.5, source: "expense" },
  { key: "repair", label: "Амортизация / ремонт", norm: 1, source: "expense" },
  { key: "other", label: "Прочие накладные", norm: 1.2, source: "expense" }
] as const;

const EXPENSE_KEYS = ARTICLES.filter((a) => a.source === "expense").map((a) => a.key);

const monthSchema = z.object({ month: z.string().regex(/^\d{4}-\d{2}$/).optional() });
const expenseSchema = z.object({
  article: z.enum(EXPENSE_KEYS as [string, ...string[]]),
  amount: z.number().int().positive().max(100_000_000),
  comment: z.string().trim().max(200).optional().default("")
});
const fixedSchema = z.object({
  items: z.array(z.object({
    article: z.enum(EXPENSE_KEYS as [string, ...string[]]),
    amount: z.number().int().min(0).max(100_000_000),
    comment: z.string().trim().max(200).optional().default("")
  })).max(50)
});
const idParamSchema = z.object({ id: z.string().uuid() });

function isFinanceManager(user: SessionUser): boolean {
  return user.role === "owner" || user.role === "manager";
}

async function requireFinanceManager(request: FastifyRequest, reply: FastifyReply): Promise<SessionUser | undefined> {
  const user = await requireUser(request, reply);
  if (!user) return undefined;
  if (!isFinanceManager(user)) {
    await reply.code(403).send({ error: "forbidden" });
    return undefined;
  }
  return user;
}

function mskToday(): string {
  const d = new Date(Date.now() + 3 * 60 * 60 * 1000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function resolveMonth(month?: string): { year: number; month: number } {
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [y, m] = month.split("-").map(Number);
    return { year: y, month: m };
  }
  const t = mskToday();
  const [y, m] = t.split("-").map(Number);
  return { year: y, month: m };
}

// Прогноз выручки месяца: факт прошедших дней + средние по дням недели на оставшиеся.
export async function predictRevenue(year: number, month: number): Promise<{ predicted: number; actualSoFar: number; daysPassed: number; daysInMonth: number; isForecast: boolean }> {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const today = mskToday();
  const dayRows = await query<{ work_date: string; revenue_total: number }>(
    `SELECT work_date::text, revenue_total FROM shift_closings
     WHERE work_date >= $1::date AND work_date < ($1::date + interval '1 month')`,
    [start]
  );
  const actualByDate = new Map<string, number>();
  for (const r of dayRows.rows) actualByDate.set(r.work_date, Number(r.revenue_total || 0));

  const wdRows = await query<{ dow: number; avg: number }>(
    `SELECT EXTRACT(DOW FROM work_date)::int AS dow, AVG(revenue_total)::float AS avg
     FROM shift_closings WHERE work_date < $1::date AND revenue_total > 0 GROUP BY 1`,
    [today]
  );
  const weekdayAvg = new Map<number, number>();
  for (const r of wdRows.rows) weekdayAvg.set(r.dow, Number(r.avg || 0));

  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  let actualSoFar = 0;
  let predicted = 0;
  let daysPassed = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const dow = new Date(Date.UTC(year, month - 1, d)).getUTCDay();
    if (iso <= today) {
      const actual = actualByDate.get(iso) || 0;
      actualSoFar += actual;
      predicted += actual;
      if (actualByDate.has(iso)) daysPassed++;
    } else {
      predicted += Math.round(weekdayAvg.get(dow) || 0);
    }
  }
  return {
    predicted: Math.round(predicted),
    actualSoFar: Math.round(actualSoFar),
    daysPassed,
    daysInMonth,
    isForecast: `${year}-${String(month).padStart(2, "0")}` === today.slice(0, 7)
  };
}

// Нормы фудкоста по группам закупок (% от выручки) — для контроля заявок.
export const PURCHASE_NORMS: Record<string, { label: string; norm: number }> = {
  food: { label: "Продукты (еда)", norm: 28 },
  bar: { label: "Бар (напитки/алкоголь)", norm: 15 },
  household: { label: "Хозтовары", norm: 1.8 }
};

async function getFinance(year: number, month: number) {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const rev = await predictRevenue(year, month);
  const revenue = rev.predicted;

  // ФОТ из графика (план по сменам месяца).
  const fotRow = await query<{ fot: string }>(
    `SELECT COALESCE(SUM(pay_amount), 0)::text AS fot FROM schedule_shifts
     WHERE work_date >= $1::date AND work_date < ($1::date + interval '1 month')`,
    [start]
  );
  const fot = Number(fotRow.rows[0]?.fot || 0);

  // Расходы месяца по статьям + постоянные платежи.
  const expRows = await query<{ article: string; total: string }>(
    `SELECT article, SUM(amount)::text AS total FROM finance_expenses
     WHERE entry_date >= $1::date AND entry_date < ($1::date + interval '1 month') GROUP BY article`,
    [start]
  );
  const expenseByArticle = new Map<string, number>();
  for (const r of expRows.rows) expenseByArticle.set(r.article, Number(r.total || 0));

  const fixedRows = await query<{ article: string; amount: number; comment: string | null }>(
    "SELECT article, amount, comment FROM finance_fixed WHERE amount > 0"
  );
  const fixedByArticle = new Map<string, number>();
  for (const r of fixedRows.rows) fixedByArticle.set(r.article, Number(r.amount || 0));

  const articles = ARTICLES.map((a) => {
    const calendar = a.source === "calendar" ? fot : 0;
    const actual = calendar + (expenseByArticle.get(a.key) || 0) + (fixedByArticle.get(a.key) || 0);
    const normAmount = Math.round((revenue * a.norm) / 100);
    return {
      key: a.key,
      label: a.label,
      norm: a.norm,
      normAmount,
      actual,
      actualPct: revenue > 0 ? Math.round((actual / revenue) * 1000) / 10 : 0,
      source: a.source
    };
  });

  const totalExpenses = articles.reduce((s, a) => s + a.actual, 0);
  const totalNorm = ARTICLES.reduce((s, a) => s + a.norm, 0);
  const ebitda = revenue - totalExpenses;

  return {
    year,
    month,
    revenue: {
      predicted: revenue,
      actualSoFar: rev.actualSoFar,
      daysPassed: rev.daysPassed,
      daysInMonth: rev.daysInMonth,
      isForecast: rev.isForecast
    },
    articles,
    fixed: ARTICLES.filter((a) => a.source === "expense").map((a) => ({
      article: a.key,
      label: a.label,
      amount: fixedByArticle.get(a.key) || 0,
      comment: fixedRows.rows.find((r) => r.article === a.key)?.comment || ""
    })),
    totals: {
      totalExpenses,
      totalNorm: Math.round(totalNorm * 10) / 10,
      totalPct: revenue > 0 ? Math.round((totalExpenses / revenue) * 1000) / 10 : 0,
      ebitda,
      ebitdaPct: revenue > 0 ? Math.round((ebitda / revenue) * 1000) / 10 : 0,
      ebitdaNorm: Math.round((100 - totalNorm) * 10) / 10
    }
  };
}

export function registerFinanceRoutes(app: FastifyInstance): void {
  app.get("/api/finance", async (request, reply) => {
    const user = await requireFinanceManager(request, reply);
    if (!user) return;
    const parsed = monthSchema.safeParse(request.query);
    const { year, month } = resolveMonth(parsed.success ? parsed.data.month : undefined);
    const data = await getFinance(year, month);
    const recent = await query<{ id: string; entry_date: string; article: string; amount: number; comment: string | null }>(
      `SELECT id::text, entry_date::text, article, amount, comment FROM finance_expenses
       WHERE entry_date >= $1::date AND entry_date < ($1::date + interval '1 month')
       ORDER BY entry_date DESC, created_at DESC LIMIT 100`,
      [`${year}-${String(month).padStart(2, "0")}-01`]
    );
    return {
      ...data,
      articleLabels: Object.fromEntries(ARTICLES.map((a) => [a.key, a.label])),
      expenseArticles: ARTICLES.filter((a) => a.source === "expense").map((a) => ({ key: a.key, label: a.label })),
      recentExpenses: recent.rows.map((r) => ({
        id: r.id,
        date: r.entry_date,
        article: r.article,
        amount: r.amount,
        comment: r.comment || ""
      }))
    };
  });

  app.post("/api/finance/expenses", async (request, reply) => {
    const user = await requireFinanceManager(request, reply);
    if (!user) return;
    const parsed = expenseSchema.safeParse(request.body);
    if (!parsed.success) {
      await reply.code(400).send({ error: "bad_expense" });
      return;
    }
    await query(
      "INSERT INTO finance_expenses (article, amount, comment, created_by) VALUES ($1, $2, $3, $4)",
      [parsed.data.article, parsed.data.amount, parsed.data.comment || null, user.id]
    );
    return { ok: true };
  });

  app.delete("/api/finance/expenses/:id", async (request, reply) => {
    const user = await requireFinanceManager(request, reply);
    if (!user) return;
    const parsed = idParamSchema.safeParse(request.params);
    if (!parsed.success) {
      await reply.code(400).send({ error: "bad_expense" });
      return;
    }
    await query("DELETE FROM finance_expenses WHERE id = $1", [parsed.data.id]);
    return { ok: true };
  });

  app.put("/api/finance/fixed", async (request, reply) => {
    const user = await requireFinanceManager(request, reply);
    if (!user) return;
    const parsed = fixedSchema.safeParse(request.body);
    if (!parsed.success) {
      await reply.code(400).send({ error: "bad_fixed" });
      return;
    }
    for (const item of parsed.data.items) {
      await query(
        `INSERT INTO finance_fixed (article, amount, comment, updated_by, updated_at)
         VALUES ($1, $2, $3, $4, now())
         ON CONFLICT (article) DO UPDATE SET amount = EXCLUDED.amount, comment = EXCLUDED.comment, updated_by = EXCLUDED.updated_by, updated_at = now()`,
        [item.article, item.amount, item.comment || null, user.id]
      );
    }
    return { ok: true };
  });
}
