import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { audit, getServices, requireUser, type SessionUser } from "./auth.js";
import { env } from "./env.js";
import { pool, query } from "./db.js";
import {
  PUBLIC_BASE_URL,
  managerChatId,
  teamChatId,
  sendMessage,
  sendPhotos,
  tgEscape,
  tgTable,
  type OutPhoto
} from "./telegram.js";
import { awardPoints } from "./progress.js";
import { recomputeStreaksForDate } from "./cashPlan.js";
import { postWeeklyDigestOnce } from "./weeklyStats.js";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const moneySchema = z.number().int().min(0).max(10000000).default(0);

const extraExpenseSchema = z.object({
  amount: moneySchema,
  comment: z.string().trim().max(300).default("")
});

const hookahLineSchema = z.object({
  employeeId: z.string().uuid(),
  count: z.number().int().min(0).max(1000).default(0)
});

const transferLineSchema = z.object({
  employeeId: z.string().uuid(),
  amount: moneySchema
});

const closingInputSchema = z.object({
  workDate: dateSchema.optional(),
  hookah: z.array(hookahLineSchema).max(10).default([]),
  transfers: z.array(transferLineSchema).max(20).default([]),
  openingCashActual: moneySchema,
  terminal1: moneySchema,
  terminal2: moneySchema,
  netmonet: moneySchema,
  yandexFood: moneySchema,
  cashRevenue: moneySchema,
  washCost: moneySchema,
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

type HookahLine = {
  employeeId: string;
  name: string;
  count: number;
  rate: number;
  payout: number;
};

type TransferLine = {
  employeeId: string;
  name: string;
  amount: number;
};

type ShiftClosingComputed = {
  workDate: string;
  submittedBy: string;
  hookahLines: HookahLine[];
  hookahEmployeeId: string | null;
  transferLines: TransferLine[];
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

type HookahLineRow = {
  id: string;
  employee_id: string;
  employee_name: string | null;
  count: number;
  rate: number;
  payout: number;
};

type TransferLineRow = {
  id: string;
  employee_id: string;
  employee_name: string | null;
  amount: number;
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
    const [openingCashExpected, revenuePlan, hookahEmployees, transferEmployees, existing] = await Promise.all([
      getOpeningCashExpected(workDate),
      getRevenuePlan(workDate),
      getHookahEmployees(),
      getActiveEmployees(),
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
      transferEmployees,
      existing
    };
  });

  app.get("/api/shift-closing/dashboard", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return;
    if (user.role !== "owner" && user.role !== "manager") {
      await reply.code(403).send({ error: "forbidden" });
      return;
    }
    const q = request.query as { month?: string };
    const now = new Date();
    let year = now.getUTCFullYear();
    let month = now.getUTCMonth() + 1;
    if (q.month && /^\d{4}-\d{2}$/.test(q.month)) {
      const [y, m] = q.month.split("-").map(Number);
      year = y;
      month = m;
    }
    return getManagerDashboard(year, month);
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
      await awardPoints(user.id, "shift_closed", "Закрыл смену", "shift_closing", id);
      await recomputeStreaksForDate(computed.workDate);
      // Отчёты шлём после загрузки фото — фронт вызовет /send-telegram-report.
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
      if (isTransferEmployeeError(error)) {
        await reply.code(400).send({ error: "bad_transfer_employee" });
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
      await recomputeStreaksForDate(computed.workDate);
      return getClosingById(params.data.id, user);
    } catch (error) {
      if (isHookahEmployeeError(error)) {
        await reply.code(400).send({ error: "bad_hookah_employee" });
        return;
      }
      if (isTransferEmployeeError(error)) {
        await reply.code(400).send({ error: "bad_transfer_employee" });
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

    // Закрытие смены за ВОСКРЕСЕНЬЕ сдано → публикуем «Итоги недели» в общий чат (один раз за неделю).
    if (new Date(`${current.work_date}T00:00:00Z`).getUTCDay() === 0) {
      try {
        await postWeeklyDigestOnce();
      } catch {
        // не валим ответ закрытия, если дайджест не ушёл
      }
    }

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
  const [openingCashExpected, revenuePlan, hookahLines, transferLines] = await Promise.all([
    getOpeningCashExpected(workDate),
    getRevenuePlan(workDate),
    resolveHookahLines(input.hookah),
    resolveTransferLines(input.transfers)
  ]);

  const extraExpenses = input.extraExpenses
    .filter((expense) => expense.amount > 0)
    .map((expense) => ({ amount: cleanInt(expense.amount), comment: cleanText(expense.comment) }));
  const extraExpensesTotal = extraExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const hookahCount = hookahLines.reduce((sum, line) => sum + line.count, 0);
  const hookahPayout = hookahLines.reduce((sum, line) => sum + line.payout, 0);
  const primaryHookah = hookahLines.length === 1 ? hookahLines[0] : null;
  const hookahRate = primaryHookah ? primaryHookah.rate : 0;
  const transferRevenue = transferLines.reduce((sum, line) => sum + line.amount, 0);
  const cashlessTotal = cleanInt(input.terminal1) + cleanInt(input.terminal2) + cleanInt(input.netmonet) + cleanInt(input.yandexFood);
  const revenueTotal = cashlessTotal + cleanInt(input.cashRevenue) + transferRevenue;
  // Переводы в выручку входят, но на физический остаток наличных НЕ влияют (решение 2026-06-07)
  const closingCashExpected =
    cleanInt(input.openingCashActual)
    + cleanInt(input.cashRevenue)
    - cleanInt(input.washCost)
    - hookahPayout
    - extraExpensesTotal
    - cleanInt(input.collectionAmount);
  const closingCashDiff = cleanInt(input.closingCashActual) - closingCashExpected;
  const revenuePlanPercent = revenuePlan > 0 ? Math.round((revenueTotal / revenuePlan) * 10000) / 100 : 0;

  return {
    workDate,
    submittedBy: user.id,
    hookahLines,
    hookahEmployeeId: primaryHookah ? primaryHookah.employeeId : null,
    transferLines,
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
    transferRevenue,
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
    await replaceHookahLines(result.rows[0].id, computed.hookahLines);
    await replaceTransferLines(result.rows[0].id, computed.transferLines);
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
    await replaceHookahLines(id, computed.hookahLines);
    await replaceTransferLines(id, computed.transferLines);
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
    computed.hookahEmployeeId,
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

async function replaceHookahLines(id: string, hookahLines: HookahLine[]): Promise<void> {
  await pool.query("DELETE FROM shift_closing_hookah WHERE shift_closing_id = $1", [id]);
  for (const line of hookahLines) {
    await pool.query(
      `
        INSERT INTO shift_closing_hookah (shift_closing_id, employee_id, count, rate, payout)
        VALUES ($1, $2, $3, $4, $5)
      `,
      [id, line.employeeId, line.count, line.rate, line.payout]
    );
  }
}

async function replaceTransferLines(id: string, transferLines: TransferLine[]): Promise<void> {
  await pool.query("DELETE FROM shift_closing_transfers WHERE shift_closing_id = $1", [id]);
  for (const line of transferLines) {
    await pool.query(
      `INSERT INTO shift_closing_transfers (shift_closing_id, employee_id, amount) VALUES ($1, $2, $3)`,
      [id, line.employeeId, line.amount]
    );
  }
}

async function resolveTransferLines(input: ShiftClosingInput["transfers"]): Promise<TransferLine[]> {
  const valid = input.filter((line) => cleanInt(line.amount) > 0);
  if (valid.length === 0) return [];
  const ids = [...new Set(valid.map((line) => line.employeeId))];
  const result = await query<{ id: string; display_name: string }>(
    `SELECT id, display_name FROM employees WHERE id = ANY($1::uuid[]) AND is_active = true`,
    [ids]
  );
  const byId = new Map(result.rows.map((row) => [row.id, row.display_name]));
  return valid.map((line) => {
    const name = byId.get(line.employeeId);
    if (!name) throw new Error("transfer_employee_not_found");
    return { employeeId: line.employeeId, name, amount: cleanInt(line.amount) };
  });
}

async function resolveHookahLines(input: ShiftClosingInput["hookah"]): Promise<HookahLine[]> {
  const valid = input.filter((line) => cleanInt(line.count) > 0);
  if (valid.length === 0) return [];

  const ids = [...new Set(valid.map((line) => line.employeeId))];
  const result = await query<{ id: string; display_name: string; hookah_rate: number }>(
    `
      SELECT id, display_name, hookah_rate
      FROM employees
      WHERE id = ANY($1::uuid[])
        AND is_active = true
        AND is_hookah_master = true
    `,
    [ids]
  );
  const byId = new Map(result.rows.map((row) => [row.id, row]));

  return valid.map((line) => {
    const employee = byId.get(line.employeeId);
    if (!employee) {
      throw new Error("hookah_employee_not_found");
    }
    const count = cleanInt(line.count);
    const rate = cleanInt(employee.hookah_rate);
    return { employeeId: employee.id, name: employee.display_name, count, rate, payout: count * rate };
  });
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

  const [expenses, hookah, transfers, photos, reports] = await Promise.all([
    query<ExtraExpenseRow>(
      `
        SELECT id, amount, comment
        FROM shift_closing_extra_expenses
        WHERE shift_closing_id = $1
        ORDER BY created_at, id
      `,
      [id]
    ),
    query<HookahLineRow>(
      `
        SELECT h.id, h.employee_id, e.display_name AS employee_name, h.count, h.rate, h.payout
        FROM shift_closing_hookah h
        LEFT JOIN employees e ON e.id = h.employee_id
        WHERE h.shift_closing_id = $1
        ORDER BY h.created_at, h.id
      `,
      [id]
    ),
    query<TransferLineRow>(
      `
        SELECT t.id, t.employee_id, e.display_name AS employee_name, t.amount
        FROM shift_closing_transfers t
        LEFT JOIN employees e ON e.id = t.employee_id
        WHERE t.shift_closing_id = $1
        ORDER BY t.created_at, t.id
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

  return serializeClosing(row, expenses.rows, hookah.rows, transfers.rows, photos.rows, reports.rows);
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
  hookah: HookahLineRow[],
  transfers: TransferLineRow[],
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
    hookah: hookah.map((line) => ({
      id: line.id,
      employeeId: line.employee_id,
      name: line.employee_name || "",
      count: line.count,
      rate: line.rate,
      payout: line.payout
    })),
    transfers: transfers.map((line) => ({
      id: line.id,
      employeeId: line.employee_id,
      name: line.employee_name || "",
      amount: line.amount
    })),
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

async function getManagerDashboard(year: number, month: number) {
  const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
  const result = await query<{
    work_date: string;
    revenue_total: number;
    revenue_plan: number;
    terminal_1: number;
    terminal_2: number;
    netmonet: number;
    yandex_food: number;
    taxi_amount: number;
  }>(
    `
      SELECT work_date::text, revenue_total, revenue_plan, terminal_1, terminal_2, netmonet, yandex_food, taxi_amount
      FROM shift_closings
      WHERE work_date >= $1::date AND work_date < ($1::date + interval '1 month')
      ORDER BY work_date
    `,
    [monthStart]
  );

  const now = new Date();
  const todayIso = now.toISOString().slice(0, 10);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const isCurrentMonth = year === now.getUTCFullYear() && month === now.getUTCMonth() + 1;
  const isPastMonth = year < now.getUTCFullYear() || (year === now.getUTCFullYear() && month < now.getUTCMonth() + 1);
  const remainingDays = isCurrentMonth ? Math.max(0, daysInMonth - now.getUTCDate() + 1) : isPastMonth ? 0 : daysInMonth;

  let monthRevenue = 0;
  let monthPlan = 0;
  let balance = 0;
  const days = result.rows.map((row) => {
    const revenue = Number(row.revenue_total || 0);
    const plan = Number(row.revenue_plan || 0);
    monthRevenue += revenue;
    monthPlan += plan;
    if (row.work_date <= todayIso) balance += revenue - plan;
    const toAccount = Math.round(
      (Number(row.terminal_1 || 0) + Number(row.terminal_2 || 0)) * 0.98
      + Number(row.yandex_food || 0) * 0.65
      + Number(row.netmonet || 0) * 0.995
      - Number(row.taxi_amount || 0)
    );
    return { date: row.work_date, revenue, plan, diff: revenue - plan, toAccount };
  });

  const latest = days.length ? days[days.length - 1] : null;
  const needPerDay = balance < 0 && remainingDays > 0 ? Math.round(-balance / remainingDays) : 0;

  const weekday = await query<{ dow: number; avg: number }>(
    `
      SELECT EXTRACT(DOW FROM work_date)::int AS dow, round(avg(revenue_total))::int AS avg
      FROM shift_closings
      WHERE work_date >= (CURRENT_DATE - interval '35 days') AND revenue_total > 0
      GROUP BY 1
    `
  );
  const avgByDow = new Map(weekday.rows.map((r) => [r.dow, Number(r.avg || 0)]));
  // Пн..Вс (dow: 1..6, 0=Вс)
  const weekdayAvg = [1, 2, 3, 4, 5, 6, 0].map((dow) => ({ dow, avg: avgByDow.get(dow) || 0 }));

  return {
    year,
    month,
    monthRevenue,
    monthPlan,
    monthPercent: monthPlan > 0 ? Math.round((monthRevenue / monthPlan) * 100) : 0,
    latest: latest
      ? { ...latest, percent: latest.plan > 0 ? Math.round((latest.revenue / latest.plan) * 100) : 0 }
      : null,
    balance,
    ahead: balance >= 0,
    needPerDay,
    remainingDays,
    days,
    weekdayAvg
  };
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

function isTransferEmployeeError(error: unknown): boolean {
  return error instanceof Error && error.message === "transfer_employee_not_found";
}

async function getActiveEmployees(): Promise<{ id: string; name: string }[]> {
  const result = await query<{ id: string; display_name: string }>(
    `SELECT id, display_name FROM employees WHERE is_active = true ORDER BY display_name`
  );
  return result.rows.map((row) => ({ id: row.id, name: row.display_name }));
}

async function sendTelegramReports(id: string, audiences: Array<"manager" | "team">) {
  const closing = await getClosingById(id);
  if (!closing) return [];

  const reports = [];
  for (const audience of audiences) {
    const chatId = audience === "manager" ? managerChatId() : teamChatId();
    let message: string;
    if (audience === "manager") {
      message = managerReportText(closing);
    } else {
      const [y, m] = closing.workDate.split("-").map(Number);
      const dash = await getManagerDashboard(y, m);
      message = teamReportText(closing, dash.ahead ? 0 : dash.needPerDay);
    }

    if (!env.telegramBotToken || !chatId) {
      reports.push(await saveTelegramReport(id, audience, "skipped", message, "", "telegram_not_configured"));
      continue;
    }

    if (audience === "manager") {
      const textRes = await sendMessage(chatId, message);
      let ok = textRes.ok;
      let error = textRes.error;
      const photos = await getClosingPhotos(id);
      if (photos.length > 0) {
        const photoRes = await sendPhotos(chatId, photos, "");
        ok = ok && photoRes.ok;
        if (!photoRes.ok) error = error || photoRes.error;
        // После успешной отправки фото в Telegram больше не храним их у нас (экономия места).
        if (photoRes.ok) await query("DELETE FROM shift_closing_photos WHERE shift_closing_id = $1", [id]);
      }
      reports.push(await saveTelegramReport(id, audience, ok ? "sent" : "failed", message, textRes.messageId, ok ? "" : error.slice(0, 500)));
    } else {
      const res = await sendMessage(chatId, message);
      reports.push(await saveTelegramReport(id, audience, res.ok ? "sent" : "failed", message, res.messageId, res.ok ? "" : res.error.slice(0, 500)));
    }
  }
  return reports;
}

async function getClosingPhotos(id: string): Promise<OutPhoto[]> {
  const result = await query<{ filename: string; mime_type: string; data: Buffer }>(
    `SELECT filename, mime_type, data FROM shift_closing_photos WHERE shift_closing_id = $1 ORDER BY created_at, id`,
    [id]
  );
  return result.rows.map((row) => ({
    buffer: row.data,
    filename: row.filename || "photo.jpg",
    mimeType: row.mime_type || "image/jpeg"
  }));
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

const RU_DOW = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];

function ruDateFull(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dow = RU_DOW[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${String(d).padStart(2, "0")}.${String(m).padStart(2, "0")}.${y} (${dow})`;
}

function ruDateShort(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dow = RU_DOW[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${String(d).padStart(2, "0")}.${String(m).padStart(2, "0")} (${dow})`;
}

function fmtNum(value: number): string {
  return Math.round(Number(value || 0)).toLocaleString("ru-RU");
}

function cashStatusLine(diff: number): string {
  if (diff < 0) return `⚠️ Касса сдана с недосдачей в ${fmtNum(-diff)}`;
  if (diff > 0) return `⚠️ Излишек в кассе ${fmtNum(diff)}`;
  return "✅ Касса сошлась";
}

function managerReportText(closing: NonNullable<Awaited<ReturnType<typeof getClosingById>>>): string {
  const v = closing.values;
  const cashPlan = Math.round(v.revenuePlan * 0.23);
  const cashPercent = cashPlan > 0 ? Math.round((v.cashRevenue / cashPlan) * 100) : 0;

  const incomeRows: Array<[string, number]> = [
    ["Безнал", v.cashlessTotal],
    ["Наличные", v.cashRevenue],
    ...(closing.transfers.length
      ? closing.transfers.map((t): [string, number] => [`Перевод (${t.name})`, t.amount])
      : [["Переводы", 0] as [string, number]])
  ];

  const expenseRows: Array<[string, number]> = [
    ["Мойка", v.washCost],
    ...closing.hookah.map((h): [string, number] => [`Кальяны ×${h.count} (${h.name})`, h.payout]),
    ...closing.extraExpenses.map((e): [string, number] => [e.comment || "Доп. расход", e.amount])
  ];
  const expenseTotal = v.washCost + v.hookahPayout + v.extraExpensesTotal;

  const cashRows: Array<[string, number]> = [
    ["Инкассация", v.collectionAmount],
    ["Остаток", v.closingCashExpected]
  ];

  const lines = [
    `<b>СМЕНА · ${ruDateFull(closing.workDate)}</b>`,
    `${tgEscape(closing.submittedBy.name)} · ${cashStatusLine(v.closingCashDiff)}`,
    ``,
    `<b>Выручка · ${v.revenuePlanPercent ? Math.round(v.revenuePlanPercent) : 0}%</b>`,
    `${fmtNum(v.revenueTotal)} из ${fmtNum(v.revenuePlan)}`,
    ``,
    `<b>Наличные · ${cashPercent}%</b>`,
    `${fmtNum(v.cashRevenue)} из ${fmtNum(cashPlan)}`,
    ``,
    `📥 <b>Поступления</b>`,
    tgTable(incomeRows, ["Итого", v.revenueTotal]),
    `📤 <b>Расходы</b>`,
    tgTable(expenseRows, ["Итого", expenseTotal]),
    `🏦 <b>Касса</b>`,
    tgTable(cashRows),
    ...(v.openingCashDiff !== 0 ? [`⚠️ Расхождение на открытии: ${fmtNum(v.openingCashDiff)}`] : []),
    ...(v.taxiAmount ? [`Такси (безнал): ${fmtNum(v.taxiAmount)}`] : []),
    ...(v.comment ? [``, `💬 ${tgEscape(v.comment)}`] : [])
  ];
  return lines.join("\n");
}

function teamReportText(closing: NonNullable<Awaited<ReturnType<typeof getClosingById>>>, deficitPerDay: number): string {
  const v = closing.values;
  const cashPlan = Math.round(v.revenuePlan * 0.23);
  const cashPercent = cashPlan > 0 ? Math.round((v.cashRevenue / cashPlan) * 100) : 0;

  const lines = [
    `📊 ${ruDateShort(closing.workDate)} · Результаты смены`,
    ``,
    `Выручка · ${v.revenuePlanPercent ? Math.round(v.revenuePlanPercent) : 0}%`,
    `${fmtNum(v.revenueTotal)} из ${fmtNum(v.revenuePlan)}`,
    ``,
    `Наличные · ${cashPercent}%`,
    `${fmtNum(v.cashRevenue)} из ${fmtNum(cashPlan)}`
  ];
  if (deficitPerDay > 0) {
    lines.push(``, `Нам не хватает ${fmtNum(deficitPerDay)} ₽ ежедневной выручки, чтобы выполнить месячный план.`);
  }
  lines.push(``, `Спасибо за смену 🙏`, `<a href="${PUBLIC_BASE_URL}/#praise">Спасибо, особенно тебе…</a>`);
  return lines.join("\n");
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

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}
