import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { audit, requireUser, type SessionUser } from "./auth.js";
import { query } from "./db.js";
import { awardPoints } from "./progress.js";

const AUDIENCES = ["all", "cook", "bar", "waiter", "dishwasher"] as const;

const createSchema = z.object({
  body: z.string().trim().min(2).max(1000),
  audience: z.enum(AUDIENCES).optional()
});

const paramsSchema = z.object({
  id: z.string().uuid()
});

type HandoverRow = {
  id: string;
  audience: string;
  from_manager: boolean;
  body: string;
  resolved: boolean;
  created_at: string;
  author_id: string | null;
  author_name: string | null;
};

function isManager(user: SessionUser): boolean {
  return user.role === "owner" || user.role === "manager";
}

function ownAudience(role: string): string {
  return (AUDIENCES as readonly string[]).includes(role) ? role : "all";
}

function audienceLabel(audience: string): string {
  switch (audience) {
    case "cook": return "Поварам";
    case "bar": return "Барменам";
    case "waiter": return "Официантам";
    case "dishwasher": return "Мойке";
    default: return "Всем";
  }
}

export function registerHandoverRoutes(app: FastifyInstance): void {
  app.get("/api/handovers", async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await requireUser(request, reply);
    if (!user) return;
    const manager = isManager(user);

    const rows = await query<HandoverRow>(
      `
        SELECT
          h.id::text,
          h.audience,
          h.from_manager,
          h.body,
          h.resolved,
          h.created_at::text,
          h.author_id::text,
          e.display_name AS author_name
        FROM shift_handovers h
        LEFT JOIN employees e ON e.id = h.author_id
        WHERE h.resolved = false
          AND ($2 = true OR h.audience = 'all' OR h.audience = $3 OR h.author_id = $1)
        ORDER BY h.from_manager DESC, h.created_at DESC
        LIMIT 100
      `,
      [user.id, manager, user.role]
    );

    return {
      canManage: manager,
      myAudience: user.role,
      audienceLabel: audienceLabel(ownAudience(user.role)),
      notes: rows.rows.map((row) => ({
        id: row.id,
        audience: row.audience,
        audienceLabel: audienceLabel(row.audience),
        fromManager: row.from_manager,
        body: row.body,
        authorName: row.author_name || "",
        authorId: row.author_id || "",
        createdAt: row.created_at,
        mine: row.author_id === user.id
      }))
    };
  });

  app.post("/api/handovers", async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await requireUser(request, reply);
    if (!user) return;
    const parsed = createSchema.safeParse(request.body);
    if (!parsed.success) {
      await reply.code(400).send({ error: "bad_handover" });
      return;
    }
    const manager = isManager(user);
    const audience = manager ? parsed.data.audience || "all" : ownAudience(user.role);

    const result = await query<{ id: string }>(
      `
        INSERT INTO shift_handovers (author_id, audience, from_manager, body)
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `,
      [user.id, audience, manager, parsed.data.body]
    );
    await audit(request, "handover_create", user.id, "handover", result.rows[0].id, { audience, fromManager: manager });
    await awardPoints(user.id, "handover_sent", "Оставил план на завтра", "handover", result.rows[0].id);
    return { ok: true, id: result.rows[0].id };
  });

  app.patch("/api/handovers/:id/resolve", async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await requireUser(request, reply);
    if (!user) return;
    const params = paramsSchema.safeParse(request.params);
    if (!params.success) {
      await reply.code(400).send({ error: "bad_handover" });
      return;
    }
    const owner = await query<{ author_id: string | null }>(
      "SELECT author_id::text FROM shift_handovers WHERE id = $1",
      [params.data.id]
    );
    if (!owner.rows[0]) {
      await reply.code(404).send({ error: "not_found" });
      return;
    }
    if (!isManager(user) && owner.rows[0].author_id !== user.id) {
      await reply.code(403).send({ error: "forbidden" });
      return;
    }
    await query("UPDATE shift_handovers SET resolved = true, resolved_at = now() WHERE id = $1", [params.data.id]);
    await audit(request, "handover_resolve", user.id, "handover", params.data.id, {});
    return { ok: true };
  });
}
