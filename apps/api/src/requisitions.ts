import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { audit, requireUser, type SessionUser } from "./auth.js";
import { pool, query } from "./db.js";
import { sendMessage, editMessageText, teamChatId, tgEscape, unitShort } from "./telegram.js";
import { awardPoints, countRecentAwards } from "./progress.js";
import { predictRevenue, PURCHASE_NORMS } from "./finance.js";

const requisitionParamsSchema = z.object({
  id: z.string().uuid()
});

const requisitionKindSchema = z.enum(["product", "household"]);
const requisitionStatusSchema = z.enum(["new", "accepted", "purchased", "rejected"]);

const requisitionLineSchema = z.object({
  catalogItemId: z.string().uuid().nullable().optional(),
  freeName: z.string().trim().max(140).optional().default(""),
  qty: z.number().positive().max(9999),
  unit: z.string().trim().min(1).max(30).optional().default("шт"),
  kind: requisitionKindSchema.optional().default("product"),
  categoryName: z.string().trim().max(100).optional().default(""),
  urgent: z.boolean().optional().default(false)
});

const requisitionCreateSchema = z.object({
  comment: z.string().trim().max(700).optional().default(""),
  urgent: z.boolean().optional().default(false),
  lines: z.array(requisitionLineSchema).min(1).max(200)
});

const requisitionPatchSchema = z.object({
  status: requisitionStatusSchema
});

const requisitionLineParamsSchema = z.object({
  id: z.string().uuid(),
  lineId: z.string().uuid()
});

const requisitionLinePatchSchema = z.object({
  purchased: z.boolean().optional(),
  purchasedQty: z.number().positive().max(99999).optional()
});

type Kind = "product" | "household";

type CategoryRow = {
  id: string;
  name: string;
  kind: Kind;
  sort_order: number;
  color: string;
  item_count: string;
};

type ItemRow = {
  id: string;
  source_id: string;
  category_id: string;
  category_name: string;
  category_color: string;
  name: string;
  unit: string;
  kind: Kind;
  sort_order: number;
  price: string | null;
  pack_label: string | null;
};

type RequisitionRow = {
  id: string;
  author_id: string | null;
  author_name: string | null;
  status: string;
  comment: string;
  urgent: boolean;
  created_at: string;
  updated_at: string;
};

type RequisitionLineRow = {
  id: string;
  requisition_id: string;
  catalog_item_id: string | null;
  item_name: string | null;
  free_name: string;
  qty: string;
  unit: string;
  kind: Kind;
  category_name: string;
  urgent: boolean;
  purchased: boolean;
  purchased_qty: string | null;
  price: string | null;
};

type NormalizedLine = {
  catalogItemId: string | null;
  freeName: string;
  qty: number;
  unit: string;
  kind: Kind;
  categoryName: string;
  urgent: boolean;
};

export function registerRequisitionRoutes(app: FastifyInstance): void {
  app.get("/api/requisitions/catalog", async (request, reply) => {
    const user = await requireRequisitionAccess(request, reply);
    if (!user) return;

    const catalog = await getVisibleCatalog(user);
    const showPrice = canManageRequisitions(user);
    return {
      categories: catalog.categories.map(serializeCategory),
      items: catalog.items.map((item) => serializeItem(item, showPrice))
    };
  });

  app.get("/api/requisitions", async (request, reply) => {
    const user = await requireRequisitionAccess(request, reply);
    if (!user) return;

    return {
      canManage: canManageRequisitions(user),
      requisitions: await getRequisitions(user)
    };
  });

  app.get("/api/requisitions/:id", async (request, reply) => {
    const user = await requireRequisitionAccess(request, reply);
    if (!user) return;

    const params = requisitionParamsSchema.safeParse(request.params);
    if (!params.success) {
      await reply.code(400).send({ error: "bad_requisition" });
      return;
    }

    const record = await getRequisitionById(params.data.id, user);
    if (!record) {
      await reply.code(404).send({ error: "not_found" });
      return;
    }
    return record;
  });

  app.post("/api/requisitions", async (request, reply) => {
    const user = await requireRequisitionAccess(request, reply);
    if (!user) return;

    const parsed = requisitionCreateSchema.safeParse(request.body);
    if (!parsed.success) {
      await reply.code(400).send({ error: "bad_requisition" });
      return;
    }

    const normalized = await normalizeLinesForUser(user, parsed.data.lines);
    if (!normalized.ok) {
      await reply.code(403).send({ error: normalized.error });
      return;
    }

    await pool.query("BEGIN");
    try {
      const anyUrgent = parsed.data.urgent || normalized.lines.some((line) => line.urgent);
      const created = await pool.query<{ id: string }>(
        `
          INSERT INTO requisitions (author_id, status, comment, urgent)
          VALUES ($1, 'new', $2, $3)
          RETURNING id
        `,
        [user.id, parsed.data.comment, anyUrgent]
      );
      const requisitionId = created.rows[0].id;

      for (const line of normalized.lines) {
        await pool.query(
          `
            INSERT INTO requisition_lines (
              requisition_id,
              catalog_item_id,
              free_name,
              qty,
              unit,
              kind,
              category_name,
              urgent
            )
            VALUES ($1, $2, $3, $4, $5, $6::requisition_kind, $7, $8)
          `,
          [
            requisitionId,
            line.catalogItemId,
            line.freeName,
            line.qty,
            line.unit,
            line.kind,
            line.categoryName,
            line.urgent
          ]
        );
      }

      await pool.query("COMMIT");
      await audit(request, "requisition_create", user.id, "requisition", requisitionId, {
        lines: normalized.lines.length,
        urgent: parsed.data.urgent
      });

      // Очки за заявку — не более 2 раз за 12 часов (защита от дробления заявок ради баллов).
      const recentRewards = await countRecentAwards(user.id, "requisition_sent", 12);
      if (recentRewards < 2) {
        await awardPoints(user.id, "requisition_sent", "Отправил заявку", "requisition", requisitionId);
      }
      const created2 = await getRequisitionById(requisitionId, user);
      const batchDate = await batchDateForRequisition(requisitionId);
      if (batchDate) void syncDailyRequisitionBatch(batchDate).catch(() => {});
      return created2;
    } catch (error) {
      await pool.query("ROLLBACK");
      throw error;
    }
  });

  app.patch("/api/requisitions/:id", async (request, reply) => {
    const user = await requireRequisitionManager(request, reply);
    if (!user) return;

    const params = requisitionParamsSchema.safeParse(request.params);
    const parsed = requisitionPatchSchema.safeParse(request.body);
    if (!params.success || !parsed.success) {
      await reply.code(400).send({ error: "bad_requisition" });
      return;
    }

    await query(
      `
        UPDATE requisitions
        SET status = $2::requisition_status,
            updated_at = now()
        WHERE id = $1
      `,
      [params.data.id, parsed.data.status]
    );
    await audit(request, "requisition_status_update", user.id, "requisition", params.data.id, parsed.data);

    // Отклонение/смена статуса меняет состав дневной заявки — обновляем общее сообщение.
    const batchDate = await batchDateForRequisition(params.data.id);
    if (batchDate) void syncDailyRequisitionBatch(batchDate).catch(() => {});

    const record = await getRequisitionById(params.data.id, user);
    if (!record) {
      await reply.code(404).send({ error: "not_found" });
      return;
    }
    return record;
  });

  // Контроль закупа: сумма заявок месяца по группам vs нормы фудкоста от прогноза выручки.
  app.get("/api/requisitions/cost-summary", async (request, reply) => {
    const user = await requireRequisitionManager(request, reply);
    if (!user) return;
    const q = request.query as { month?: string };
    const now = new Date();
    let year = now.getUTCFullYear();
    let month = now.getUTCMonth() + 1;
    if (q.month && /^\d{4}-\d{2}$/.test(q.month)) {
      [year, month] = q.month.split("-").map(Number);
    }
    const start = `${year}-${String(month).padStart(2, "0")}-01`;
    const rev = await predictRevenue(year, month);
    const rows = await query<{ grp: string; spent: string }>(
      `SELECT CASE WHEN l.kind = 'household' THEN 'household'
                   WHEN lower(l.category_name) ~ 'алкогол|напит' THEN 'bar'
                   ELSE 'food' END AS grp,
              COALESCE(SUM(COALESCE(i.price, 0) * COALESCE(l.purchased_qty, l.qty)), 0)::text AS spent
       FROM requisition_lines l
       JOIN requisitions r ON r.id = l.requisition_id
       LEFT JOIN requisition_catalog_items i ON i.id = l.catalog_item_id
       WHERE r.created_at >= $1::date AND r.created_at < ($1::date + interval '1 month')
         AND r.status <> 'rejected'
       GROUP BY grp`,
      [start]
    );
    const spentBy = new Map(rows.rows.map((r) => [r.grp, Number(r.spent)]));
    const groups = Object.entries(PURCHASE_NORMS).map(([key, cfg]) => {
      const spent = Math.round(spentBy.get(key) || 0);
      const budget = Math.round((rev.predicted * cfg.norm) / 100);
      return {
        key,
        label: cfg.label,
        norm: cfg.norm,
        spent,
        budget,
        pct: rev.predicted > 0 ? Math.round((spent / rev.predicted) * 1000) / 10 : 0,
        over: spent > budget
      };
    });
    return { year, month, revenue: rev.predicted, isForecast: rev.isForecast, groups };
  });

  // Галочка «закуплено» по позиции заявки (руководитель).
  app.patch("/api/requisitions/:id/lines/:lineId", async (request, reply) => {
    const user = await requireRequisitionManager(request, reply);
    if (!user) return;
    const params = requisitionLineParamsSchema.safeParse(request.params);
    const parsed = requisitionLinePatchSchema.safeParse(request.body);
    if (!params.success || !parsed.success) {
      await reply.code(400).send({ error: "bad_requisition" });
      return;
    }
    await query(
      `UPDATE requisition_lines
       SET purchased = COALESCE($3, purchased),
           purchased_qty = COALESCE($4, purchased_qty)
       WHERE id = $2 AND requisition_id = $1`,
      [params.data.id, params.data.lineId, parsed.data.purchased ?? null, parsed.data.purchasedQty ?? null]
    );
    // Все позиции закуплены → статус «Закуплена»; снятие галочки с закрытой → обратно «Принята».
    const agg = await query<{ total: string; bought: string; status: string }>(
      `SELECT COUNT(*)::text AS total, COUNT(*) FILTER (WHERE purchased)::text AS bought,
              (SELECT status FROM requisitions WHERE id = $1) AS status
       FROM requisition_lines WHERE requisition_id = $1`,
      [params.data.id]
    );
    const row = agg.rows[0];
    const total = Number(row?.total || 0);
    const bought = Number(row?.bought || 0);
    let newStatus: string | null = null;
    if (total > 0 && bought === total && row.status !== "purchased") newStatus = "purchased";
    else if (bought < total && row.status === "purchased") newStatus = "accepted";
    if (newStatus) {
      await query("UPDATE requisitions SET status = $2::requisition_status, updated_at = now() WHERE id = $1", [params.data.id, newStatus]);
    }
    const record = await getRequisitionById(params.data.id, user);
    if (!record) {
      await reply.code(404).send({ error: "not_found" });
      return;
    }
    return record;
  });

  // Правка собственной заявки автором: заменить позиции/комментарий (пока заявка new/accepted).
  app.put("/api/requisitions/:id/lines", async (request, reply) => {
    const user = await requireRequisitionAccess(request, reply);
    if (!user) return;
    const params = requisitionParamsSchema.safeParse(request.params);
    const parsed = requisitionCreateSchema.safeParse(request.body);
    if (!params.success || !parsed.success) {
      await reply.code(400).send({ error: "bad_requisition" });
      return;
    }
    const owner = await query<{ author_id: string | null; status: string }>(
      "SELECT author_id::text, status::text FROM requisitions WHERE id = $1",
      [params.data.id]
    );
    const row = owner.rows[0];
    if (!row) {
      await reply.code(404).send({ error: "not_found" });
      return;
    }
    const canManage = canManageRequisitions(user);
    if (!canManage && row.author_id !== user.id) {
      await reply.code(403).send({ error: "forbidden" });
      return;
    }
    if (row.status !== "new" && row.status !== "accepted") {
      await reply.code(409).send({ error: "requisition_locked" });
      return;
    }
    const normalized = await normalizeLinesForUser(user, parsed.data.lines);
    if (!normalized.ok) {
      await reply.code(403).send({ error: normalized.error });
      return;
    }

    await pool.query("BEGIN");
    try {
      await pool.query("DELETE FROM requisition_lines WHERE requisition_id = $1", [params.data.id]);
      for (const line of normalized.lines) {
        await pool.query(
          `INSERT INTO requisition_lines
             (requisition_id, catalog_item_id, free_name, qty, unit, kind, category_name, urgent)
           VALUES ($1, $2, $3, $4, $5, $6::requisition_kind, $7, $8)`,
          [params.data.id, line.catalogItemId, line.freeName, line.qty, line.unit, line.kind, line.categoryName, line.urgent]
        );
      }
      const anyUrgent = parsed.data.urgent || normalized.lines.some((line) => line.urgent);
      await pool.query(
        "UPDATE requisitions SET comment = $2, urgent = $3, updated_at = now() WHERE id = $1",
        [params.data.id, parsed.data.comment, anyUrgent]
      );
      await pool.query("COMMIT");
    } catch (error) {
      await pool.query("ROLLBACK");
      throw error;
    }
    await audit(request, "requisition_edit", user.id, "requisition", params.data.id, { lines: normalized.lines.length });
    const batchDate = await batchDateForRequisition(params.data.id);
    if (batchDate) void syncDailyRequisitionBatch(batchDate).catch(() => {});
    return getRequisitionById(params.data.id, user);
  });

  // Удаление собственной заявки автором (пока new/accepted); руководитель — без ограничений по статусу.
  app.delete("/api/requisitions/:id", async (request, reply) => {
    const user = await requireRequisitionAccess(request, reply);
    if (!user) return;
    const params = requisitionParamsSchema.safeParse(request.params);
    if (!params.success) {
      await reply.code(400).send({ error: "bad_requisition" });
      return;
    }
    const owner = await query<{ author_id: string | null; status: string }>(
      "SELECT author_id::text, status::text FROM requisitions WHERE id = $1",
      [params.data.id]
    );
    const row = owner.rows[0];
    if (!row) {
      await reply.code(404).send({ error: "not_found" });
      return;
    }
    const canManage = canManageRequisitions(user);
    if (!canManage && row.author_id !== user.id) {
      await reply.code(403).send({ error: "forbidden" });
      return;
    }
    if (!canManage && row.status !== "new" && row.status !== "accepted") {
      await reply.code(409).send({ error: "requisition_locked" });
      return;
    }
    const batchDate = await batchDateForRequisition(params.data.id);
    await pool.query("BEGIN");
    try {
      await pool.query("DELETE FROM requisition_lines WHERE requisition_id = $1", [params.data.id]);
      await pool.query("DELETE FROM requisitions WHERE id = $1", [params.data.id]);
      await pool.query("COMMIT");
    } catch (error) {
      await pool.query("ROLLBACK");
      throw error;
    }
    await audit(request, "requisition_delete", user.id, "requisition", params.data.id, {});
    if (batchDate) void syncDailyRequisitionBatch(batchDate).catch(() => {});
    return { ok: true };
  });
}

async function requireRequisitionAccess(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<SessionUser | undefined> {
  // Заявка (в т.ч. хозтовары) доступна всем авторизованным сотрудникам.
  return requireUser(request, reply);
}

async function requireRequisitionManager(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<SessionUser | undefined> {
  const user = await requireUser(request, reply);
  if (!user) return undefined;
  if (!canManageRequisitions(user)) {
    await reply.code(403).send({ error: "forbidden" });
    return undefined;
  }
  return user;
}

function canManageRequisitions(user: SessionUser): boolean {
  return user.role === "owner" || user.role === "manager";
}

async function getVisibleCatalog(user: SessionUser): Promise<{ categories: CategoryRow[]; items: ItemRow[] }> {
  const [categoriesResult, itemsResult] = await Promise.all([
    query<CategoryRow>(
      `
        SELECT
          c.id::text,
          c.name,
          c.kind::text AS kind,
          c.sort_order,
          c.color,
          COUNT(i.id) FILTER (WHERE i.active = true)::text AS item_count
        FROM requisition_categories c
        LEFT JOIN requisition_catalog_items i ON i.category_id = c.id
        WHERE c.active = true
        GROUP BY c.id, c.name, c.kind, c.sort_order, c.color
        ORDER BY c.kind, c.sort_order, c.name
      `
    ),
    query<ItemRow>(
      `
        SELECT
          i.id::text,
          i.source_id,
          i.category_id::text,
          c.name AS category_name,
          c.color AS category_color,
          i.name,
          i.unit,
          i.kind::text AS kind,
          i.sort_order,
          i.price,
          i.pack_label
        FROM requisition_catalog_items i
        JOIN requisition_categories c ON c.id = i.category_id
        WHERE i.active = true
          AND c.active = true
        ORDER BY i.kind, c.sort_order, i.sort_order, i.name
      `
    )
  ]);

  const categories = categoriesResult.rows.filter((category) => canSeeCategory(user, category));
  const visibleCategoryIds = new Set(categories.map((category) => category.id));
  const items = itemsResult.rows.filter((item) => visibleCategoryIds.has(item.category_id));
  const counts = new Map<string, number>();
  for (const item of items) {
    counts.set(item.category_id, (counts.get(item.category_id) || 0) + 1);
  }

  return {
    categories: categories.map((category) => ({
      ...category,
      item_count: String(counts.get(category.id) || 0)
    })),
    items
  };
}

function canSeeCategory(user: SessionUser, category: Pick<CategoryRow, "name" | "kind">): boolean {
  if (canManageRequisitions(user)) return true;
  // Хозяйственные товары (household) доступны всем должностям для заказа.
  if (category.kind === "household") return true;

  const name = normalizeCategoryName(category.name);
  if (user.role === "bar") {
    return category.kind === "product" && (name.includes("алкоголь") || name.includes("напит") || name.includes("фрукт"));
  }
  if (user.role === "cook") {
    return !name.includes("алкоголь") && !name.includes("напит");
  }

  // Официанты/мойка и пр. — только хозтовары (обработаны выше), продукты не заказывают.
  return false;
}

function normalizeCategoryName(name: string): string {
  return name.toLowerCase().replaceAll("ё", "е");
}

async function normalizeLinesForUser(
  user: SessionUser,
  lines: z.infer<typeof requisitionLineSchema>[]
): Promise<{ ok: true; lines: NormalizedLine[] } | { ok: false; error: string }> {
  const catalog = await getVisibleCatalog(user);
  const items = new Map(catalog.items.map((item) => [item.id, item]));
  const categories = catalog.categories;
  const normalized: NormalizedLine[] = [];

  for (const line of lines) {
    const qty = normalizeQty(line.qty);
    if (!qty) {
      return { ok: false, error: "bad_requisition_line" };
    }

    if (line.catalogItemId) {
      const item = items.get(line.catalogItemId);
      if (!item) {
        return { ok: false, error: "forbidden_catalog_item" };
      }
      normalized.push({
        catalogItemId: item.id,
        freeName: "",
        qty,
        unit: item.unit,
        kind: item.kind,
        categoryName: item.category_name,
        urgent: line.urgent
      });
      continue;
    }

    const freeName = line.freeName.trim();
    if (!freeName) {
      return { ok: false, error: "bad_requisition_line" };
    }

    const category = findFreeCategory(categories, line.kind, line.categoryName);
    if (!category) {
      return { ok: false, error: "forbidden_category" };
    }

    normalized.push({
      catalogItemId: null,
      freeName,
      qty,
      unit: line.unit.trim() || "шт",
      kind: category.kind,
      categoryName: category.name,
      urgent: line.urgent
    });
  }

  return { ok: true, lines: normalized };
}

function normalizeQty(value: number): number {
  const qty = Math.round(Number(value) * 100) / 100;
  return Number.isFinite(qty) && qty > 0 && qty <= 9999 ? qty : 0;
}

function findFreeCategory(
  categories: CategoryRow[],
  kind: Kind,
  categoryName: string
): Pick<CategoryRow, "name" | "kind"> | undefined {
  const selected = categoryName.trim();
  if (selected) {
    return categories.find((category) => category.kind === kind && category.name === selected);
  }
  return categories.find((category) => category.kind === kind);
}

async function getRequisitions(user: SessionUser) {
  const canManage = canManageRequisitions(user);
  const result = await query<RequisitionRow>(
    `
      SELECT
        r.id::text,
        r.author_id::text,
        e.display_name AS author_name,
        r.status::text,
        r.comment,
        r.urgent,
        r.created_at::text,
        r.updated_at::text
      FROM requisitions r
      LEFT JOIN employees e ON e.id = r.author_id
      WHERE ($1::boolean = true OR r.author_id = $2)
      ORDER BY r.created_at DESC
      LIMIT 100
    `,
    [canManage, user.id]
  );

  return serializeRequisitions(result.rows, await getLinesForRequisitions(result.rows.map((row) => row.id)), canManage);
}

async function getRequisitionById(id: string, user: SessionUser) {
  const canManage = canManageRequisitions(user);
  const result = await query<RequisitionRow>(
    `
      SELECT
        r.id::text,
        r.author_id::text,
        e.display_name AS author_name,
        r.status::text,
        r.comment,
        r.urgent,
        r.created_at::text,
        r.updated_at::text
      FROM requisitions r
      LEFT JOIN employees e ON e.id = r.author_id
      WHERE r.id = $1
        AND ($2::boolean = true OR r.author_id = $3)
      LIMIT 1
    `,
    [id, canManage, user.id]
  );
  const row = result.rows[0];
  if (!row) return undefined;
  return serializeRequisitions([row], await getLinesForRequisitions([row.id]), canManage)[0];
}

// ── Единое общее сообщение заявок за день (П10) ───────────────────────────────
// Все заявки одного дня (МСК) сводятся в одно сообщение, которое бот РЕДАКТИРУЕТ по мере
// добавления/правок. Новые позиции — ➕ жирным, удалённые — ➖ зачёркнутыми (один цикл).
// Группировка — день оформления (created_at в МСК). Содержимое под сворачиваемой цитатой (П6).

type BatchLine = { key: string; kind: Kind; category: string; name: string; unit: string; qty: number; urgent: boolean };

async function batchDateForRequisition(id: string): Promise<string | null> {
  const r = await query<{ d: string }>(
    "SELECT (created_at AT TIME ZONE 'Europe/Moscow')::date::text AS d FROM requisitions WHERE id = $1",
    [id]
  );
  return r.rows[0]?.d ?? null;
}

// Сводим все непрорезанные позиции дня по (вид|категория|имя|единица), суммируя количество.
async function aggregateBatch(batchDate: string): Promise<BatchLine[]> {
  const res = await query<{ kind: Kind; category_name: string; name: string; unit: string; qty: string; urgent: boolean }>(
    `SELECT l.kind::text AS kind, l.category_name,
            COALESCE(i.name, l.free_name) AS name, l.unit, l.qty::text AS qty, l.urgent
     FROM requisition_lines l
     JOIN requisitions r ON r.id = l.requisition_id
     LEFT JOIN requisition_catalog_items i ON i.id = l.catalog_item_id
     WHERE (r.created_at AT TIME ZONE 'Europe/Moscow')::date = $1::date
       AND r.status <> 'rejected'`,
    [batchDate]
  );
  const map = new Map<string, BatchLine>();
  for (const row of res.rows) {
    const name = (row.name || "").trim() || "—";
    const category = row.category_name || "Прочее";
    const unit = row.unit || "шт";
    const key = `${row.kind}|${category.toLowerCase()}|${name.toLowerCase()}|${unit.toLowerCase()}`;
    const qty = Number(row.qty || 0);
    const existing = map.get(key);
    if (existing) {
      existing.qty += qty;
      existing.urgent = existing.urgent || row.urgent;
    } else {
      map.set(key, { key, kind: row.kind, category, name, unit, qty, urgent: row.urgent });
    }
  }
  return [...map.values()];
}

function formatBatchDate(batchDate: string): string {
  const d = new Date(`${batchDate}T00:00:00+03:00`);
  const wd = new Intl.DateTimeFormat("ru-RU", { weekday: "short", timeZone: "Europe/Moscow" }).format(d);
  const dm = new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", timeZone: "Europe/Moscow" }).format(d);
  return `${dm} (${wd})`;
}

function renderBatchMessage(batchDate: string, current: BatchLine[], removed: BatchLine[], prevKeys: Set<string>): string {
  type Tagged = BatchLine & { state: "added" | "kept" | "removed" };
  const tagged: Tagged[] = [
    ...current.map((l): Tagged => ({ ...l, state: prevKeys.has(l.key) ? "kept" : "added" })),
    ...removed.map((l): Tagged => ({ ...l, state: "removed" }))
  ];
  const lineText = (l: Tagged): string => {
    const body = `${tgEscape(l.name)} — ${formatQtyPlain(l.qty)} ${tgEscape(unitShort(l.unit))}`;
    if (l.state === "added") return `➕ <b>${body}</b>`;
    if (l.state === "removed") return `➖ <s>${body}</s>`;
    return body;
  };

  const blocks: string[] = [];
  const urgent = tagged.filter((l) => l.urgent && l.state !== "removed");
  if (urgent.length) blocks.push(`⚠️ СРОЧНО\n${urgent.map(lineText).join("\n")}`);

  const byCat = new Map<string, Tagged[]>();
  for (const l of tagged) {
    if (l.urgent && l.state !== "removed") continue; // уже в «СРОЧНО»
    const cat = l.category || "Прочее";
    const list = byCat.get(cat) ?? [];
    list.push(l);
    byCat.set(cat, list);
  }
  for (const [cat, items] of byCat) {
    blocks.push(`${tgEscape(cat)}\n${items.map(lineText).join("\n")}`);
  }

  const head = `🧾 <b>Заявка на ${formatBatchDate(batchDate)}</b>`;
  let inner = blocks.join("\n\n");
  // Защита от лимита Telegram (4096 символов с тегами).
  if (head.length + inner.length + 40 > 4096) {
    inner = `${inner.slice(0, 3900)}\n…`;
  }
  return `${head}\n<blockquote expandable>${inner}</blockquote>`;
}

export async function syncDailyRequisitionBatch(batchDate: string): Promise<void> {
  if (!teamChatId()) return;
  const current = await aggregateBatch(batchDate);
  const existing = await query<{ chat_id: string; message_id: string; snapshot: BatchLine[] }>(
    "SELECT chat_id, message_id, snapshot FROM requisition_tg_messages WHERE batch_date = $1",
    [batchDate]
  );
  const prev = existing.rows[0];
  const prevSnap: BatchLine[] = Array.isArray(prev?.snapshot) ? prev!.snapshot : [];
  const prevKeys = new Set(prevSnap.map((l) => l.key));
  const curKeys = new Set(current.map((l) => l.key));
  const removed = prevSnap.filter((l) => !curKeys.has(l.key));

  if (!current.length && !removed.length) return;

  const text = renderBatchMessage(batchDate, current, removed, prevKeys);
  let messageId = prev?.message_id || "";
  if (messageId) {
    const res = await editMessageText(prev!.chat_id, messageId, text);
    if (!res.ok) messageId = ""; // сообщение могло быть удалено — отправим заново
  }
  if (!messageId) {
    const res = await sendMessage(teamChatId(), text);
    if (!res.ok || !res.messageId) return;
    messageId = res.messageId;
  }
  await query(
    `INSERT INTO requisition_tg_messages (batch_date, chat_id, message_id, snapshot, updated_at)
     VALUES ($1, $2, $3, $4::jsonb, now())
     ON CONFLICT (batch_date) DO UPDATE
       SET chat_id = EXCLUDED.chat_id, message_id = EXCLUDED.message_id,
           snapshot = EXCLUDED.snapshot, updated_at = now()`,
    [batchDate, teamChatId(), messageId, JSON.stringify(current)]
  );
}

function formatQtyPlain(qty: number): string {
  return Number.isInteger(qty) ? String(qty) : String(Math.round(qty * 100) / 100);
}

async function getLinesForRequisitions(ids: string[]): Promise<Map<string, RequisitionLineRow[]>> {
  const map = new Map<string, RequisitionLineRow[]>();
  if (!ids.length) return map;

  const result = await query<RequisitionLineRow>(
    `
      SELECT
        l.id::text,
        l.requisition_id::text,
        l.catalog_item_id::text,
        i.name AS item_name,
        l.free_name,
        l.qty::text,
        l.unit,
        l.kind::text AS kind,
        l.category_name,
        l.urgent,
        l.purchased,
        l.purchased_qty,
        i.price
      FROM requisition_lines l
      LEFT JOIN requisition_catalog_items i ON i.id = l.catalog_item_id
      WHERE l.requisition_id = ANY($1::uuid[])
      ORDER BY l.created_at, l.id
    `,
    [ids]
  );

  for (const row of result.rows) {
    const existing = map.get(row.requisition_id) || [];
    existing.push(row);
    map.set(row.requisition_id, existing);
  }
  return map;
}

function serializeCategory(category: CategoryRow) {
  return {
    id: category.id,
    name: category.name,
    kind: category.kind,
    sortOrder: Number(category.sort_order || 0),
    color: category.color || "#2f7a52",
    itemCount: Number(category.item_count || 0)
  };
}

function serializeItem(item: ItemRow, showPrice: boolean) {
  return {
    id: item.id,
    sourceId: item.source_id,
    categoryId: item.category_id,
    categoryName: item.category_name,
    categoryColor: item.category_color || "#2f7a52",
    name: item.name,
    unit: item.unit,
    kind: item.kind,
    sortOrder: Number(item.sort_order || 0),
    // Цены видит только руководитель; сотрудникам не отдаём.
    price: !showPrice || item.price == null ? null : Number(item.price),
    packLabel: item.pack_label || ""
  };
}

function serializeRequisitions(rows: RequisitionRow[], linesByRequisition: Map<string, RequisitionLineRow[]>, showPrice: boolean) {
  return rows.map((row) => {
    const lines = (linesByRequisition.get(row.id) || []).map((line) => serializeLine(line, showPrice));
    return {
      id: row.id,
      authorId: row.author_id || "",
      authorName: row.author_name || "",
      status: row.status,
      statusLabel: statusLabel(row.status),
      comment: row.comment || "",
      urgent: row.urgent,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      totalLines: lines.length,
      productLines: lines.filter((line) => line.kind === "product").length,
      householdLines: lines.filter((line) => line.kind === "household").length,
      totalCost: lines.reduce((sum, line) => sum + (line.cost || 0), 0),
      lines
    };
  });
}

function serializeLine(line: RequisitionLineRow, showPrice: boolean) {
  return {
    id: line.id,
    catalogItemId: line.catalog_item_id || "",
    name: line.item_name || line.free_name || "",
    freeName: line.free_name || "",
    qty: Number(line.qty || 0),
    unit: line.unit || "шт",
    kind: line.kind,
    categoryName: line.category_name || "",
    urgent: Boolean(line.urgent),
    purchased: Boolean(line.purchased),
    purchasedQty: line.purchased_qty == null ? null : Number(line.purchased_qty),
    // Цены/стоимость видит только руководитель.
    price: !showPrice || line.price == null ? null : Number(line.price),
    cost: !showPrice || line.price == null ? 0 : Math.round(Number(line.price) * Number(line.qty || 0))
  };
}

function statusLabel(status: string): string {
  return {
    new: "Новая",
    accepted: "Принята",
    purchased: "Закуплена",
    rejected: "Отклонена"
  }[status] || "Новая";
}
