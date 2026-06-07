import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { audit, getServices, requireUser, type SessionUser } from "./auth.js";
import { pool, query } from "./db.js";
import { sendMessage, teamChatId, tgEscape } from "./telegram.js";

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
    return {
      categories: catalog.categories.map(serializeCategory),
      items: catalog.items.map(serializeItem)
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

      const created2 = await getRequisitionById(requisitionId, user);
      if (created2) void notifyRequisition(created2).catch(() => {});
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

    const record = await getRequisitionById(params.data.id, user);
    if (!record) {
      await reply.code(404).send({ error: "not_found" });
      return;
    }
    return record;
  });
}

async function requireRequisitionAccess(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<SessionUser | undefined> {
  const user = await requireUser(request, reply);
  if (!user) return undefined;
  if (canManageRequisitions(user)) return user;

  const services = await getServices(user.id);
  if (!services.some((service) => service.code === "requisition" && service.can_view)) {
    await reply.code(403).send({ error: "forbidden" });
    return undefined;
  }
  return user;
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
          i.sort_order
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

  const name = normalizeCategoryName(category.name);
  if (user.role === "bar") {
    return category.kind === "product" && (name.includes("алкоголь") || name.includes("напит") || name.includes("фрукт"));
  }
  if (user.role === "cook") {
    return !name.includes("алкоголь") && !name.includes("напит");
  }

  return !name.includes("алкоголь") && !name.includes("напит");
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

  return serializeRequisitions(result.rows, await getLinesForRequisitions(result.rows.map((row) => row.id)));
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
  return serializeRequisitions([row], await getLinesForRequisitions([row.id]))[0];
}

async function notifyRequisition(req: NonNullable<Awaited<ReturnType<typeof getRequisitionById>>>): Promise<void> {
  if (!teamChatId()) return;
  const lines = req.lines.map((line) => `• ${tgEscape(line.name)} — ${line.qty} ${tgEscape(line.unit)}${line.urgent ? " ⚠️" : ""}`);
  const parts = [
    `🧾 <b>Новая заявка продуктов</b>`,
    `От: ${tgEscape(req.authorName || "—")}${req.urgent ? " · ⚠️ срочно" : ""}`,
    "",
    ...lines
  ];
  if (req.comment) parts.push("", `💬 ${tgEscape(req.comment)}`);
  await sendMessage(teamChatId(), parts.join("\n"));
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
        l.urgent
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

function serializeItem(item: ItemRow) {
  return {
    id: item.id,
    sourceId: item.source_id,
    categoryId: item.category_id,
    categoryName: item.category_name,
    categoryColor: item.category_color || "#2f7a52",
    name: item.name,
    unit: item.unit,
    kind: item.kind,
    sortOrder: Number(item.sort_order || 0)
  };
}

function serializeRequisitions(rows: RequisitionRow[], linesByRequisition: Map<string, RequisitionLineRow[]>) {
  return rows.map((row) => {
    const lines = (linesByRequisition.get(row.id) || []).map(serializeLine);
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
      lines
    };
  });
}

function serializeLine(line: RequisitionLineRow) {
  return {
    id: line.id,
    catalogItemId: line.catalog_item_id || "",
    name: line.item_name || line.free_name || "",
    freeName: line.free_name || "",
    qty: Number(line.qty || 0),
    unit: line.unit || "шт",
    kind: line.kind,
    categoryName: line.category_name || "",
    urgent: Boolean(line.urgent)
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
