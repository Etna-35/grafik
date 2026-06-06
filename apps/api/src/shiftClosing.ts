import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { audit, getServices, requireUser, type SessionUser } from "./auth.js";
import { env } from "./env.js";
import { pool, query } from "./db.js";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const moneySchema = z.number().int().min(0).max(10000000).default(0);

const extraExpenseSchema = z.object({
  amount: moneySchema,
  comment: z.string().trim().max(300).default("")
});

const closingInputSchema = z.object({
  workDate: dateSchema.optional(),
  hookahEmployeeId: z.string().uuid().nullable().optional(),
  openingCashActual: moneySchema,
  terminal1: moneySchema,
  terminal2: moneySchema,
  netmonet: moneySchema,
  yandexFood: moneySchema,
  cashRevenue: moneySchema,
  transferRevenue: moneySchema,
  washCost: moneySchema,
  hookahCount: z.number().int().min(0).max(1000).default(0),
  taxiAmount: moneySchema,
  collectionAmount: moneySchema,
  closingCashActual: moneySchema,
  extraExpenses: z.array(extraExpenseSchema).max(40).default([]),
  comment: z.string().trim().max(2000).default("")
});

const paramsSchema = z.object({
  id: z.string().uuid()
});

const photoSchema = z.object({
  photoType: z.enum(["terminal_1", "terminal_2", "shift_close", "other"]),
  filename: z.string().trim().max(180).default(""),
  mimeType: z.string().trim().max(80).default("application/octet-stream"),
  dataUrl: z.string().min(1).max(12_000_000)
});

const reportSchema = z.object({
  audience: z.enum(["manager", "team", "both"]).default("both")
}).default({ audience: "both" });

type ShiftClosingInput = z.infer<typeof closingInputSchema>;

type HookahEmployee = {
  id: string | null;
  name: string;
  rate: number;
};

type ShiftClosingComputed = {
  workDate: string;
  submittedBy: string;
  hookahEmployee: HookahEmployee;
  cashDiffLimit: number;
  taxiLimit: number;
  revenuePlan: number;
  openingCashExpected: number;
  openingCashActual: number;
  openingCashDiff: number;
  terminal1: number;
  terminal2: number;
  netmonet: number;
  yandexFood: number;
  cashlessTotal: number;
  cashRevenue: number;
  transferRevenue: number;
  revenueTotal: number;
  washCost: number;
  hookahCount: number;
  hookahRate: number;
  hookahPayout: number;
  taxiAmount: number;
  extraExpensesTotal: number;
  collectionAmount: number;
  closingCashActual: number;
  closingCashExpected: number;
  closingCashDiff: number;
  revenuePlanPercent: number;
  comment: string;
};

type ShiftClosingRow = {
  id: string;
  work_date: string;
  submitted_by: string | null;
  submitted_by_name: string | null;
  hookah_employee_id: string | null;
  hookah_employee_name: string | null;
  status: string;
  cash_diff_limit: number;
  taxi_limit: number;
  revenue_plan: number;
  opening_cash_expected: number;
  opening_cash_actual: number;
  opening_cash_diff: number;
  terminal_1: number;
  terminal_2: number;
  netmonet: number;
  yandex_food: number;
  cashless_total: number;
  cash_revenue: number;
  transfer_revenue: number;
  revenue_total: number;
  wash_cost: number;
  hookah_count: number;
  hookah_rate: number;
  hookah_payout: number;
  taxi_amount: number;
  extra_expenses_total: number;
  collection_amount: number;
  closing_cash_actual: number;
  closing_cash_expected: number;
  closing_cash_diff: number;
  revenue_plan_percent: string;
  comment: string;
  submitted_at: string;
  created_at: string;
  updated_at: string;
};

type ExtraExpenseRow = {
  id: string;
  amount: number;
  comment: string;
};

type PhotoRow = {
  id: string;
  photo_type: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
};

type TelegramReportRow = {
  id: string;
  audience: string;
  status: string;
  format: string;
  message_text: string;
  telegram_message_id: string | null;
  error: string;
  sent_at: string | null;
  created_at: string;
};

export function registerShiftClosingRoutes(app: FastifyInstance): void {
  app.get("/api/shift-closing/init", async (request, reply) => {
    const user = await requireShiftCloseAccess(request, reply);
    if (!user) return;

    const serverShiftDate = currentShiftWorkDate();
    const requestedDate = (request.query as { date?: string }).date;
    const parsedDate = requestedDate ? dateSchema.safeParse(requestedDate) : null;
    const workDate = parsedDate && parsedDate.success ? parsedDate.data : serverShiftDate;
    const [openingCashExpected, revenuePlan, hookahEmployees, existing] = await Promise.all([
      getOpeningCashExpected(workDate),
      getRevenuePlan(workDate),
      getHookahEmployees(),
      getClosingByDate(workDate, user)
    ]);
    const hookahEmployee = selectedHookahEmployee(existing?.hookahEmployee, hookahEmployees);

    return {
      workDate,
      serverShiftDate,
      user: {
        id: user.id,
        displayName: user.display_name,
        role: user.role
      },
      openingCashExpected,
      revenuePlan,
      cashDiffLimit: 500,
      taxiLimit: 2000,
      hookahEmployee,
      hookahEmployees,
      existing
    };
  });

  app.post("/api/shift-closing", async (request, reply) => {
    const user = await requireShiftCloseAccess(request, reply);
    if (!user) return;

    const parsed = closingInputSchema.safeParse(request.body);
    if (!parsed.success) {
      await reply.code(400).send({ error: "bad_shift_closing" });
      return;
    }

    try {
      const computed = await computeClosing(user, parsed.data);
      const id = await createClosing(computed, parsed.data.extraExpenses);
      await audit(request, "shift_closing_create", user.id, "shift_closing", id, computed);
      void sendTelegramReports(id, ["manager", "team"]).catch((telegramError) => {
        app.log.warn({ err: telegramError, shiftClosingId: id }, "Shift closing Telegram report failed");
      });
      return getClosingById(id, user);
    } catch (error) {
      if (isUniqueViolation(error)) {
        await reply.code(409).send({ error: "shift_already_closed" });
        return;
      }
      if (isHookahEmployeeError(error)) {
        await reply.code(400).send({ error: "bad_hookah_employee" });
        return;
      }
      throw error;
    }
  });

  app.get("/api/shift-closing/:id", async (request, reply) => {
    const user = await requireShiftCloseAccess(request, reply);
    if (!user) return;

    const params = paramsSchema.safeParse(request.params);
    if (!params.success) {
      await reply.code(400).send({ error: "bad_shift_closing" });
      return;
    }

    const result = await getClosingById(params.data.id, user);
    if (!result) {
      await reply.code(404).send({ error: "not_found" });
      return;
    }
    return result;
  });

  app.patch("/api/shift-closing/:id", async (request, reply) => {
    const user = await requireShiftCloseAccess(request, reply);
    if (!user) return;

    const params = paramsSchema.safeParse(request.params);
    const parsed = closingInputSchema.safeParse(request.body);
    if (!params.success || !parsed.success) {
      await reply.code(400).send({ error: "bad_shift_closing" });
      return;
    }

    const current = await getClosingOwner(params.data.id);
    if (!current) {
      await reply.code(404).send({ error: "not_found" });
      return;
    }
    if (!canEditClosing(user, current.submitted_by)) {
      await reply.code(403).send({ error: "forbidden" });
      return;
    }

    try {
      const computed = await computeClosing(user, { ...parsed.data, workDate: current.work_date });
      await updateClosing(params.data.id, computed, parsed.data.extraExpenses);
      await audit(request, "shift_closing_update", user.id, "shift_closing", params.data.id, computed);
      return getClosingById(params.data.id, user);
    } catch (error) {
      if (isHookahEmployeeError(error)) {
        await reply.code(400).send({ error: "bad_hookah_employee" });
        return;
      }
      throw error;
    }
  });

  app.post("/api/shift-closing/:id/photos", async (request, reply) => {
    const user = await requireShiftCloseAccess(request, reply);
    if (!user) return;

    const params = paramsSchema.safeParse(request.params);
    const parsed = photoSchema.safeParse(request.body);
    if (!params.success || !parsed.success) {
      await reply.code(400).send({ error: "bad_photo" });
      return;
    }

    const current = await getClosingOwner(params.data.id);
    if (!current) {
      await reply.code(404).send({ error: "not_found" });
      return;
    }
    if (!canEditClosing(user, current.submitted_by)) {
      await reply.code(403).send({ error: "forbidden" });
      return;
    }

    const photo = decodePhoto(parsed.data.dataUrl);
    if (photo.length > 8 * 1024 * 1024) {
      await reply.code(413).send({ error: "photo_too_large" });
      return;
    }

    const result = await query<{ id: string }>(
      `
        INSERT INTO shift_closing_photos (
          shift_closing_id,
          photo_type,
          filename,
          mime_type,
          size_bytes,
          data,
          uploaded_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `,
      [
        params.data.id,
        parsed.data.photoType,
        parsed.data.filename,
        parsed.data.mimeType,
        photo.length,
        photo,
        user.id
      ]
    );
    await audit(request, "shift_closing_photo_upload", user.id, "shift_closing_photo", result.rows[0].id, {
      shiftClosingId: params.data.id,
      photoType: parsed.data.photoType,
      sizeBytes: photo.length
    });
    return { ok: true, id: result.rows[0].id };
  });

  app.post("/api/shift-closing/:id/send-telegram-report", async (request, reply) => {
    const user = await requireShiftCloseAccess(request, reply);
    if (!user) return;

    const params = paramsSchema.safeParse(request.params);
    const parsed = reportSchema.safeParse(request.body || {});
    if (!params.success || !parsed.success) {
      await reply.code(400).send({ error: "bad_report" });
      return;
    }

    const current = await getClosingOwner(params.data.id);
    if (!current) {
      await reply.code(404).send({ error: "not_found" });
      return;
    }
    if (!canEditClosing(user, current.submitted_by)) {
      await reply.code(403).send({ error: "forbidden" });
      return;
    }

    const audiences = parsed.data.audience === "both" ? ["manager", "team"] : [parsed.data.audience];
    const reports = await sendTelegramReports(params.data.id, audiences as Array<"manager" | "team">);
    await audit(request, "shift_closing_telegram_send", user.id, "shift_closing", params.data.id, reports);
    return { ok: true, reports };
  });
}

async function requireShiftCloseAccess(request: FastifyRequest, reply: FastifyReply): Promise<SessionUser | undefined> {
  const user = await requireUser(request, reply);
  if (!user) return undefined;
  if (user.role === "owner" || user.role === "manager") return user;

  const services = await getServices(user.id);
  if (!services.some((service) => service.code === "shift_close" && service.can_view)) {
    await reply.code(403).send({ error: "forbidden" });
    return undefined;
  }
  return user;
}

function canEditClosing(user: SessionUser, submittedBy: string | null): boolean {
  return user.role === "owner" || user.role === "manager" || submittedBy === user.id;
}

async function computeClosing(user: SessionUser, input: ShiftClosingInput): Promise<ShiftClosingComputed> {
  const workDate = input.workDate || currentShiftWorkDate();
  const [openingCashExpected, revenuePlan, hookahEmployee] = await Promise.all([
    getOpeningCashExpected(workDate),
    getRevenuePlan(workDate),
    getHookahEmployee(input.hookahEmployeeId)
  ]);

  const extraExpenses = input.extraExpenses
    .filter((expense) => expense.amount > 0)
    .map((expense) => ({ amount: cleanInt(expense.amount), comment: cleanText(expense.comment) }));
  const extraExpensesTotal = extraExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const hookahRate = cleanInt(hookahEmployee.rate);
  const hookahCount = cleanInt(input.hookahCount);
  const cashlessTotal = cleanInt(input.terminal1) + cleanInt(input.terminal2) + cleanInt(input.netmonet) + cleanInt(input.yandexFood);
  const revenueTotal = cashlessTotal + cleanInt(input.cashRevenue) + cleanInt(input.transferRevenue);
  const hookahPayout = hookahCount * hookahRate;
  const closingCashExpected =
    cleanInt(input.openingCashActual)
    + cleanInt(input.cashRevenue)
    + cleanInt(input.transferRevenue)
    - cleanInt(input.washCost)
    - hookahPayout
    - extraExpensesTotal
    - cleanInt(input.collectionAmount);
  const closingCashDiff = cleanInt(input.closingCashActual) - closingCashExpected;
  const revenuePlanPercent = revenuePlan > 0 ? Math.round((revenueTotal / revenuePlan) * 10000) / 100 : 0;

  return {
    workDate,
    submittedBy: user.id,
    hookahEmployee,
    cashDiffLimit: 500,
    taxiLimit: 2000,
    revenuePlan,
    openingCashExpected,
    openingCashActual: cleanInt(input.openingCashActual),
    openingCashDiff: cleanInt(input.openingCashActual) - openingCashExpected,
    terminal1: cleanInt(input.terminal1),
    terminal2: cleanInt(input.terminal2),
    netmonet: cleanInt(input.netmonet),
    yandexFood: cleanInt(input.yandexFood),
    cashlessTotal,
    cashRevenue: cleanInt(input.cashRevenue),
    transferRevenue: cleanInt(input.transferRevenue),
    revenueTotal,
    washCost: cleanInt(input.washCost),
    hookahCount,
    hookahRate,
    hookahPayout,
    taxiAmount: cleanInt(input.taxiAmount),
    extraExpensesTotal,
    collectionAmount: cleanInt(input.collectionAmount),
    closingCashActual: cleanInt(input.closingCashActual),
    closingCashExpected,
    closingCashDiff,
    revenuePlanPercent,
    comment: cleanText(input.comment)
  };
}

async function createClosing(computed: ShiftClosingComputed, extraExpenses: ShiftClosingInput["extraExpenses"]): Promise<string> {
  await pool.query("BEGIN");
  try {
    const result = await pool.query<{ id: string }>(
      `
        INSERT INTO shift_closings (
          work_date,
          submitted_by,
          hookah_employee_id,
          cash_diff_limit,
          taxi_limit,
          revenue_plan,
          opening_cash_expected,
          opening_cash_actual,
          opening_cash_diff,
          terminal_1,
          terminal_2,
          netmonet,
          yandex_food,
          cashless_total,
          cash_revenue,
          transfer_revenue,
          revenue_total,
          wash_cost,
          hookah_count,
          hookah_rate,
          hookah_payout,
          taxi_amount,
          extra_expenses_total,
          collection_amount,
          closing_cash_actual,
          closing_cash_expected,
          closing_cash_diff,
          revenue_plan_percent,
          comment
        )
        VALUES (
          $1::date, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18, $19,
          $20, $21, $22, $23, $24, $25, $26, $27, $28, $29
        )
        RETURNING id
      `,
      closingParams(computed)
    );
    await replaceExtraExpenses(result.rows[0].id, extraExpenses);
    await pool.query("COMMIT");
    return result.rows[0].id;
  } catch (error) {
    await pool.query("ROLLBACK");
    throw error;
  }
}

async function updateClosing(id: string, computed: ShiftClosingComputed, extraExpenses: ShiftClosingInput["extraExpenses"]): Promise<void> {
  await pool.query("BEGIN");
  try {
    await pool.query(
      `
        UPDATE shift_closings
        SET submitted_by = $2,
            hookah_employee_id = $3,
            cash_diff_limit = $4,
            taxi_limit = $5,
            revenue_plan = $6,
            opening_cash_expected = $7,
            opening_cash_actual = $8,
            opening_cash_diff = $9,
            terminal_1 = $10,
            terminal_2 = $11,
            netmonet = $12,
            yandex_food = $13,
            cashless_total = $14,
            cash_revenue = $15,
            transfer_revenue = $16,
            revenue_total = $17,
            wash_cost = $18,
            hookah_count = $19,
            hookah_rate = $20,
            hookah_payout = $21,
            taxi_amount = $22,
            extra_expenses_total = $23,
            collection_amount = $24,
            closing_cash_actual = $25,
            closing_cash_expected = $26,
            closing_cash_diff = $27,
            revenue_plan_percent = $28,
            comment = $29,
            updated_at = now()
        WHERE id = $1
      `,
      [id, ...closingParams(computed).slice(1)]
    );
    await replaceExtraExpenses(id, extraExpenses);
    await pool.query("COMMIT");
  } catch (error) {
    await pool.query("ROLLBACK");
    throw error;
  }
}

function closingParams(computed: ShiftClosingComputed): unknown[] {
  return [
    computed.workDate,
    computed.submittedBy,
    computed.hookahEmployee.id,
    computed.cashDiffLimit,
    computed.taxiLimit,
    computed.revenuePlan,
    computed.openingCashExpected,
    computed.openingCashActual,
    computed.openingCashDiff,
    computed.terminal1,
    computed.terminal2,
    computed.netmonet,
    computed.yandexFood,
    computed.cashlessTotal,
    computed.cashRevenue,
    computed.transferRevenue,
    computed.revenueTotal,
    computed.washCost,
    computed.hookahCount,
    computed.hookahRate,
    computed.hookahPayout,
    computed.taxiAmount,
    computed.extraExpensesTotal,
    computed.collectionAmount,
    computed.closingCashActual,
    computed.closingCashExpected,
    computed.closingCashDiff,
    computed.revenuePlanPercent,
    computed.comment
  ];
}

async function replaceExtraExpenses(id: string, extraExpenses: ShiftClosingInput["extraExpenses"]): Promise<void> {
  await pool.query("DELETE FROM shift_closing_extra_expenses WHERE shift_closing_id = $1", [id]);
  for (const expense of extraExpenses.filter((item) => item.amount > 0)) {
    await pool.query(
      `
        INSERT INTO shift_closing_extra_expenses (shift_closing_id, amount, comment)
        VALUES ($1, $2, $3)
      `,
      [id, cleanInt(expense.amount), cleanText(expense.comment)]
    );
  }
}

async function getClosingByDate(workDate: string, user?: SessionUser) {
  const result = await query<{ id: string }>("SELECT id FROM shift_closings WHERE work_date = $1::date", [workDate]);
  if (!result.rows[0]) return null;
  return getClosingById(result.rows[0].id, user);
}

async function getClosingById(id: string, user?: SessionUser) {
  const closing = await query<ShiftClosingRow>(
    `
      SELECT
        sc.id,
        sc.work_date::text,
        sc.submitted_by,
        submitter.display_name AS submitted_by_name,
        sc.hookah_employee_id,
        hookah.display_name AS hookah_employee_name,
        sc.status,
        sc.cash_diff_limit,
        sc.taxi_limit,
        sc.revenue_plan,
        sc.opening_cash_expected,
        sc.opening_cash_actual,
        sc.opening_cash_diff,
        sc.terminal_1,
        sc.terminal_2,
        sc.netmonet,
        sc.yandex_food,
        sc.cashless_total,
        sc.cash_revenue,
        sc.transfer_revenue,
        sc.revenue_total,
        sc.wash_cost,
        sc.hookah_count,
        sc.hookah_rate,
        sc.hookah_payout,
        sc.taxi_amount,
        sc.extra_expenses_total,
        sc.collection_amount,
        sc.closing_cash_actual,
        sc.closing_cash_expected,
        sc.closing_cash_diff,
        sc.revenue_plan_percent::text,
        sc.comment,
        sc.submitted_at::text,
        sc.created_at::text,
        sc.updated_at::text
      FROM shift_closings sc
      LEFT JOIN employees submitter ON submitter.id = sc.submitted_by
      LEFT JOIN employees hookah ON hookah.id = sc.hookah_employee_id
      WHERE sc.id = $1
      LIMIT 1
    `,
    [id]
  );
  const row = closing.rows[0];
  if (!row) return null;
  if (user && !canEditClosing(user, row.submitted_by)) return null;

  const [expenses, photos, reports] = await Promise.all([
    query<ExtraExpenseRow>(
      `
        SELECT id, amount, comment
        FROM shift_closing_extra_expenses
        WHERE shift_closing_id = $1
        ORDER BY created_at, id
      `,
      [id]
    ),
    query<PhotoRow>(
      `
        SELECT id, photo_type, filename, mime_type, size_bytes, created_at::text
        FROM shift_closing_photos
        WHERE shift_closing_id = $1
        ORDER BY created_at, id
      `,
      [id]
    ),
    query<TelegramReportRow>(
      `
        SELECT id, audience, status, format, message_text, telegram_message_id, error, sent_at::text, created_at::text
        FROM shift_closing_telegram_reports
        WHERE shift_closing_id = $1
        ORDER BY created_at DESC
        LIMIT 20
      `,
      [id]
    )
  ]);

  return serializeClosing(row, expenses.rows, photos.rows, reports.rows);
}

async function getClosingOwner(id: string): Promise<{ submitted_by: string | null; work_date: string } | undefined> {
  const result = await query<{ submitted_by: string | null; work_date: string }>(
    "SELECT submitted_by, work_date::text FROM shift_closings WHERE id = $1",
    [id]
  );
  return result.rows[0];
}

function serializeClosing(
  row: ShiftClosingRow,
  expenses: ExtraExpenseRow[],
  photos: PhotoRow[],
  reports: TelegramReportRow[]
) {
  return {
    id: row.id,
    workDate: row.work_date,
    submittedBy: {
      id: row.submitted_by || "",
      name: row.submitted_by_name || ""
    },
    hookahEmployee: {
      id: row.hookah_employee_id || "",
      name: row.hookah_employee_name || "",
      rate: row.hookah_rate
    },
    status: row.status,
    limits: {
      cashDiff: row.cash_diff_limit,
      taxi: row.taxi_limit
    },
    values: {
      revenuePlan: row.revenue_plan,
      openingCashExpected: row.opening_cash_expected,
      openingCashActual: row.opening_cash_actual,
      openingCashDiff: row.opening_cash_diff,
      terminal1: row.terminal_1,
      terminal2: row.terminal_2,
      netmonet: row.netmonet,
      yandexFood: row.yandex_food,
      cashlessTotal: row.cashless_total,
      cashRevenue: row.cash_revenue,
      transferRevenue: row.transfer_revenue,
      revenueTotal: row.revenue_total,
      washCost: row.wash_cost,
      hookahCount: row.hookah_count,
      hookahRate: row.hookah_rate,
      hookahPayout: row.hookah_payout,
      taxiAmount: row.taxi_amount,
      extraExpensesTotal: row.extra_expenses_total,
      collectionAmount: row.collection_amount,
      closingCashActual: row.closing_cash_actual,
      closingCashExpected: row.closing_cash_expected,
      closingCashDiff: row.closing_cash_diff,
      revenuePlanPercent: Number(row.revenue_plan_percent),
      comment: row.comment || ""
    },
    flags: {
      cashDiffExceeded: Math.abs(row.closing_cash_diff) > row.cash_diff_limit,
      taxiExceeded: row.taxi_amount > row.taxi_limit
    },
    extraExpenses: expenses.map((expense) => ({
      id: expense.id,
      amount: expense.amount,
      comment: expense.comment || ""
    })),
    photos: photos.map((photo) => ({
      id: photo.id,
      photoType: photo.photo_type,
      filename: photo.filename || "",
      mimeType: photo.mime_type || "",
      sizeBytes: photo.size_bytes,
      createdAt: photo.created_at
    })),
    telegramReports: reports.map((report) => ({
      id: report.id,
      audience: report.audience,
      status: report.status,
      format: report.format,
      messageText: report.message_text || "",
      telegramMessageId: report.telegram_message_id || "",
      error: report.error || "",
      sentAt: report.sent_at || "",
      createdAt: report.created_at
    })),
    submittedAt: row.submitted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function getOpeningCashExpected(workDate: string): Promise<number> {
  const result = await query<{ closing_cash_actual: number }>(
    `
      SELECT closing_cash_actual
      FROM shift_closings
      WHERE work_date < $1::date
      ORDER BY work_date DESC, updated_at DESC
      LIMIT 1
    `,
    [workDate]
  );
  return result.rows[0]?.closing_cash_actual || 0;
}

async function getRevenuePlan(workDate: string): Promise<number> {
  const result = await query<{ fot: string }>(
    `
      SELECT COALESCE(SUM(pay_amount), 0)::text AS fot
      FROM schedule_shifts
      WHERE work_date = $1::date
    `,
    [workDate]
  );
  const fot = Number(result.rows[0]?.fot || 0);
  return fot > 0 ? Math.round(fot / 0.23) : 0;
}

async function getHookahEmployee(employeeId?: string | null): Promise<HookahEmployee> {
  if (employeeId) {
    const selected = await query<{ id: string; display_name: string; hookah_rate: number }>(
      `
        SELECT id, display_name, hookah_rate
        FROM employees
        WHERE id = $1
          AND is_active = true
          AND is_hookah_master = true
        LIMIT 1
      `,
      [employeeId]
    );
    const row = selected.rows[0];
    if (!row) {
      throw new Error("hookah_employee_not_found");
    }
    return {
      id: row.id,
      name: row.display_name,
      rate: row.hookah_rate || 0
    };
  }

  const result = await query<{ id: string; display_name: string; hookah_rate: number }>(
    `
      SELECT id, display_name, hookah_rate
      FROM employees
      WHERE is_active = true
        AND is_hookah_master = true
      ORDER BY updated_at DESC, display_name
      LIMIT 1
    `
  );
  const row = result.rows[0];
  return {
    id: row?.id || null,
    name: row?.display_name || "",
    rate: row?.hookah_rate || 0
  };
}

async function getHookahEmployees(): Promise<HookahEmployee[]> {
  const result = await query<{ id: string; display_name: string; hookah_rate: number }>(
    `
      SELECT id, display_name, hookah_rate
      FROM employees
      WHERE is_active = true
        AND is_hookah_master = true
      ORDER BY display_name
    `
  );
  return result.rows.map((row) => ({
    id: row.id,
    name: row.display_name,
    rate: row.hookah_rate || 0
  }));
}

function selectedHookahEmployee(existing: HookahEmployee | undefined, employees: HookahEmployee[]): HookahEmployee {
  if (existing?.id) return existing;
  return employees[0] || { id: null, name: "", rate: 0 };
}

function isHookahEmployeeError(error: unknown): boolean {
  return error instanceof Error && error.message === "hookah_employee_not_found";
}

async function sendTelegramReports(id: string, audiences: Array<"manager" | "team">) {
  const closing = await getClosingById(id);
  if (!closing) return [];

  const reports = [];
  for (const audience of audiences) {
    const message = audience === "manager" ? managerReportText(closing) : teamReportText(closing);
    const chatId = audience === "manager" ? env.telegramManagerChatId : env.telegramTeamChatId;
    if (!env.telegramBotToken || !chatId) {
      reports.push(await saveTelegramReport(id, audience, "skipped", message, "", "telegram_not_configured"));
      continue;
    }

    try {
      const result = await fetch(`https://api.telegram.org/bot${env.telegramBotToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: "HTML",
          disable_web_page_preview: true
        })
      });
      if (!result.ok) {
        const errorText = await result.text();
        reports.push(await saveTelegramReport(id, audience, "failed", message, "", cleanText(errorText).slice(0, 500)));
        continue;
      }
      const body = await result.json() as { result?: { message_id?: number } };
      reports.push(await saveTelegramReport(id, audience, "sent", message, String(body.result?.message_id || ""), ""));
    } catch (error) {
      const text = error instanceof Error ? error.message : String(error);
      reports.push(await saveTelegramReport(id, audience, "failed", message, "", cleanText(text).slice(0, 500)));
    }
  }
  return reports;
}

async function saveTelegramReport(
  id: string,
  audience: "manager" | "team",
  status: "sent" | "failed" | "skipped",
  message: string,
  telegramMessageId: string,
  error: string
) {
  const result = await query<TelegramReportRow>(
    `
      INSERT INTO shift_closing_telegram_reports (
        shift_closing_id,
        audience,
        status,
        format,
        message_text,
        telegram_message_id,
        error,
        sent_at
      )
      VALUES ($1, $2, $3, 'text', $4, $5, $6, CASE WHEN $3 = 'sent' THEN now() ELSE NULL END)
      RETURNING id, audience, status, format, message_text, telegram_message_id, error, sent_at::text, created_at::text
    `,
    [id, audience, status, message, telegramMessageId || null, error]
  );
  const row = result.rows[0];
  return {
    id: row.id,
    audience: row.audience,
    status: row.status,
    format: row.format,
    messageText: row.message_text || "",
    telegramMessageId: row.telegram_message_id || "",
    error: row.error || "",
    sentAt: row.sent_at || "",
    createdAt: row.created_at
  };
}

function managerReportText(closing: Awaited<ReturnType<typeof getClosingById>>): string {
  if (!closing) return "";
  const v = closing.values;
  return [
    `<b>Etna · закрытие смены</b>`,
    `Дата: ${escapeTelegram(closing.workDate)}`,
    `Сотрудник: ${escapeTelegram(closing.submittedBy.name)}`,
    ``,
    `<b>Выручка</b>`,
    `Терминал 1: ${money(v.terminal1)}`,
    `Терминал 2: ${money(v.terminal2)}`,
    `Нетмонет: ${money(v.netmonet)}`,
    `Яндекс.Еда: ${money(v.yandexFood)}`,
    `Безнал итого: ${money(v.cashlessTotal)}`,
    `Наличные: ${money(v.cashRevenue)}`,
    `Переводы: ${money(v.transferRevenue)}`,
    `Выручка итого: ${money(v.revenueTotal)}`,
    ``,
    `<b>Расходы</b>`,
    `Мойка: ${money(v.washCost)}`,
    `Кальяны: ${v.hookahCount} × ${money(v.hookahRate)} = ${money(v.hookahPayout)}`,
    `Доп. расходы: ${money(v.extraExpensesTotal)}`,
    `Такси: ${money(v.taxiAmount)} (не вычитается из кассы)`,
    `Инкассация: ${money(v.collectionAmount)}`,
    ``,
    `<b>Касса</b>`,
    `Открытие расч.: ${money(v.openingCashExpected)}`,
    `Открытие факт: ${money(v.openingCashActual)}`,
    `Открытие Δ: ${money(v.openingCashDiff)}`,
    `Закрытие расч.: ${money(v.closingCashExpected)}`,
    `Закрытие факт: ${money(v.closingCashActual)}`,
    `Разница: ${money(v.closingCashDiff)}${closing.flags.cashDiffExceeded ? " · выше лимита" : ""}`,
    ``,
    `<b>План</b>`,
    `План: ${money(v.revenuePlan)}`,
    `Выполнение: ${percent(v.revenuePlanPercent)}`,
    v.comment ? `\nКомментарий: ${escapeTelegram(v.comment)}` : ""
  ].filter((line) => line !== "").join("\n");
}

function teamReportText(closing: Awaited<ReturnType<typeof getClosingById>>): string {
  if (!closing) return "";
  const v = closing.values;
  return [
    `<b>Etna · смена закрыта</b>`,
    `Дата: ${escapeTelegram(closing.workDate)}`,
    `Сотрудник: ${escapeTelegram(closing.submittedBy.name)}`,
    `Выручка: ${money(v.revenueTotal)}`,
    `План: ${percent(v.revenuePlanPercent)}`
  ].join("\n");
}

function currentShiftWorkDate(): string {
  const now = new Date();
  const moscow = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  if (moscow.getUTCHours() < 6) {
    moscow.setUTCDate(moscow.getUTCDate() - 1);
  }
  return `${moscow.getUTCFullYear()}-${String(moscow.getUTCMonth() + 1).padStart(2, "0")}-${String(moscow.getUTCDate()).padStart(2, "0")}`;
}

function decodePhoto(dataUrl: string): Buffer {
  const [, data] = dataUrl.includes(",") ? dataUrl.split(",", 2) : ["", dataUrl];
  return Buffer.from(data, "base64");
}

function cleanInt(value: unknown): number {
  const number = Number(value || 0);
  if (!Number.isFinite(number) || number < 0) return 0;
  return Math.round(number);
}

function cleanText(value: unknown): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function money(value: number): string {
  return `${Math.round(Number(value || 0)).toLocaleString("ru-RU")} ₽`;
}

function percent(value: number): string {
  return `${Math.round(Number(value || 0))}%`;
}

function escapeTelegram(value: string): string {
  return cleanText(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}
