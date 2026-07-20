import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { audit, requireUser, type SessionUser } from "./auth.js";
import { query } from "./db.js";

// Поэтапное включение фич (staged rollout). Флаг выключен по умолчанию: нет строки = выключено.
// Новая фича гейтится: бэк — await isFeatureEnabled('code'); фронт — if(!state.features?.code) return "".

export async function isFeatureEnabled(code: string): Promise<boolean> {
  const r = await query<{ enabled: boolean }>("SELECT enabled FROM feature_flags WHERE code = $1", [code]);
  return Boolean(r.rows[0]?.enabled);
}

export async function getAllFeatures(): Promise<Record<string, boolean>> {
  const r = await query<{ code: string; enabled: boolean }>("SELECT code, enabled FROM feature_flags");
  const map: Record<string, boolean> = {};
  for (const row of r.rows) map[row.code] = row.enabled;
  return map;
}

const setSchema = z.object({
  code: z.string().trim().min(2).max(60).regex(/^[a-z0-9_]+$/),
  enabled: z.boolean()
});

async function requireManager(request: FastifyRequest, reply: FastifyReply): Promise<SessionUser | undefined> {
  const user = await requireUser(request, reply);
  if (!user) return undefined;
  if (user.role !== "owner" && user.role !== "manager") {
    await reply.code(403).send({ error: "forbidden" });
    return undefined;
  }
  return user;
}

export function registerFeatureRoutes(app: FastifyInstance): void {
  app.put("/api/admin/features", async (request, reply) => {
    const user = await requireManager(request, reply);
    if (!user) return;

    const parsed = setSchema.safeParse(request.body);
    if (!parsed.success) {
      await reply.code(400).send({ error: "bad_feature" });
      return;
    }

    await query(
      `INSERT INTO feature_flags (code, enabled) VALUES ($1, $2)
       ON CONFLICT (code) DO UPDATE SET enabled = excluded.enabled, updated_at = now()`,
      [parsed.data.code, parsed.data.enabled]
    );
    await audit(request, "feature_flag_set", user.id, "feature_flag", parsed.data.code, parsed.data);
    return { ok: true, features: await getAllFeatures() };
  });
}
