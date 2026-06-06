import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { audit, requireUser } from "./auth.js";
import { query } from "./db.js";

const createSchema = z.object({
  toId: z.string().uuid(),
  body: z.string().trim().min(2).max(500)
});

type FeedRow = {
  id: string;
  body: string;
  created_at: string;
  from_name: string | null;
  to_name: string | null;
};

type ColleagueRow = {
  id: string;
  display_name: string;
};

export function registerPraiseRoutes(app: FastifyInstance): void {
  app.get("/api/praises", async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await requireUser(request, reply);
    if (!user) return;

    const [feed, colleagues] = await Promise.all([
      query<FeedRow>(
        `
          SELECT
            p.id::text,
            p.body,
            p.created_at::text,
            f.display_name AS from_name,
            t.display_name AS to_name
          FROM praises p
          LEFT JOIN employees f ON f.id = p.from_id
          LEFT JOIN employees t ON t.id = p.to_id
          ORDER BY p.created_at DESC
          LIMIT 50
        `
      ),
      query<ColleagueRow>(
        `
          SELECT id::text, display_name
          FROM employees
          WHERE is_active = true
            AND archived_at IS NULL
            AND id <> $1
          ORDER BY display_name
        `,
        [user.id]
      )
    ]);

    return {
      colleagues: colleagues.rows.map((row) => ({ id: row.id, name: row.display_name })),
      feed: feed.rows.map((row) => ({
        id: row.id,
        body: row.body,
        fromName: row.from_name || "",
        toName: row.to_name || "",
        createdAt: row.created_at
      }))
    };
  });

  app.post("/api/praises", async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await requireUser(request, reply);
    if (!user) return;
    const parsed = createSchema.safeParse(request.body);
    if (!parsed.success) {
      await reply.code(400).send({ error: "bad_praise" });
      return;
    }
    if (parsed.data.toId === user.id) {
      await reply.code(400).send({ error: "cannot_praise_self" });
      return;
    }
    const result = await query<{ id: string }>(
      `
        INSERT INTO praises (from_id, to_id, body)
        VALUES ($1, $2, $3)
        RETURNING id
      `,
      [user.id, parsed.data.toId, parsed.data.body]
    );
    await audit(request, "praise_create", user.id, "praise", result.rows[0].id, { toId: parsed.data.toId });
    return { ok: true, id: result.rows[0].id };
  });
}
