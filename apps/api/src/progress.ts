import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { audit, requireUser, type SessionUser } from "./auth.js";
import { query } from "./db.js";
import { isFeatureEnabled } from "./features.js";

const POINTS_PER_LEVEL = 100;
const TENURE_POINTS_PER_MONTH = 30;

export const PROGRESS_POINTS = {
  manager_task: 30,
  role_task: 10,
  praise_peer: 10,
  praise_manager: 20,
  praise_giver: 5,
  plan_met: 50,
  requisition_sent: 5,
  handover_sent: 5,
  shift_closed: 10,
  chapter_read: 5,
  quiz_passed: 15,
  attestation_passed: 40,
  challenge_test: 20,
  sales_goal: 20
} as const;

const KIND_LABELS: Record<string, string> = {
  manager_task: "Задание руководителя",
  role_task: "Задание смены",
  praise_peer: "Спасибо от коллеги",
  praise_manager: "Спасибо от руководителя",
  praise_giver: "Сказал спасибо",
  plan_met: "План выполнен",
  requisition_sent: "Отправил заявку",
  handover_sent: "Оставил план на завтра",
  shift_closed: "Закрыл смену",
  chapter_read: "Прочитал главу",
  quiz_passed: "Сдал тест",
  attestation_passed: "Сдал аттестацию",
  challenge_test: "Проверка знаний",
  sales_goal: "Достиг цели по продажам",
  tenure: "Стаж работы"
};

function isManager(user: SessionUser): boolean {
  return user.role === "owner" || user.role === "manager";
}

function tenureMonths(startDate: string | null): number {
  if (!startDate) return 0;
  const start = new Date(startDate);
  if (Number.isNaN(start.getTime())) return 0;
  const now = new Date();
  let months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  if (now.getDate() < start.getDate()) months--;
  return Math.max(0, months);
}

// ===== Бонусы тотемов (миграция 050) =====
// Именной тотем может усиливать начисление очков владельцу. Всё считается в одной точке —
// в awardPoints, поэтому новые виды бонусов добавляются одной строкой в applies().
// Гейтится флагом totem_bonuses: пока он выключен, очки начисляются как раньше.

type TotemBonus = { kind: string; pct: number };

const PRAISE_KINDS = new Set(["praise_peer", "praise_manager", "praise_giver"]);

async function activeTotemBonuses(employeeId: string): Promise<TotemBonus[]> {
  const r = await query<{ bonus_kind: string; bonus_pct: number }>(
    `SELECT bonus_kind, bonus_pct FROM totem_awards
     WHERE employee_id = $1 AND bonus_kind IS NOT NULL AND bonus_pct <> 0
       AND (bonus_until IS NULL OR bonus_until >= (now() AT TIME ZONE 'Europe/Moscow')::date)`,
    [employeeId]
  );
  return r.rows.map((row) => ({ kind: row.bonus_kind, pct: Number(row.bonus_pct) }));
}

// «Особый день» для тотема Кота Шрёдингера: сегодня 3-я (6-я, 9-я…) смена подряд
// ИЛИ первая смена после трёх и более выходных подряд. Считаем по графику.
async function isStreakDay(employeeId: string): Promise<boolean> {
  const r = await query<{ d: string }>(
    `SELECT work_date::text AS d FROM schedule_shifts
     WHERE employee_id = $1
       AND work_date <= (now() AT TIME ZONE 'Europe/Moscow')::date
       AND work_date > ((now() AT TIME ZONE 'Europe/Moscow')::date - 40)
     ORDER BY work_date DESC`,
    [employeeId]
  );
  const days = new Set(r.rows.map((row) => row.d));
  const today = new Date(Date.now() + 3 * 60 * 60 * 1000);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  if (!days.has(iso(today))) return false; // сегодня не рабочий день — бонуса нет

  let streak = 0;
  const cursor = new Date(today.getTime());
  while (days.has(iso(cursor))) {
    streak++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  if (streak % 3 === 0) return true; // каждая 3-я смена подряд

  let off = 0;
  while (!days.has(iso(cursor)) && off < 10) {
    off++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak === 1 && off >= 3; // вернулся после 3+ выходных
}

async function totemMultiplier(employeeId: string, kind: keyof typeof PROGRESS_POINTS): Promise<number> {
  if (!(await isFeatureEnabled("totem_bonuses"))) return 1;
  const bonuses = await activeTotemBonuses(employeeId);
  if (!bonuses.length) return 1;
  let mult = 1;
  for (const b of bonuses) {
    if (b.kind === "all") mult += b.pct / 100;
    else if (b.kind === "shift" && kind === "shift_closed") mult += b.pct / 100;
    else if (b.kind === "praise" && PRAISE_KINDS.has(kind)) mult += b.pct / 100;
    else if (b.kind === "shift_streak" && (await isStreakDay(employeeId))) mult += b.pct / 100;
  }
  return mult;
}

/** Начислить очки сотруднику. Если передан ref — повторное начисление за тот же объект игнорируется. */
export async function awardPoints(
  employeeId: string,
  kind: keyof typeof PROGRESS_POINTS,
  note: string,
  refType?: string,
  refId?: string
): Promise<void> {
  const base = PROGRESS_POINTS[kind];
  const mult = await totemMultiplier(employeeId, kind);
  const points = Math.max(1, Math.round(base * mult));
  await query(
    `
      INSERT INTO progress_events (employee_id, kind, points, note, ref_type, ref_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (employee_id, ref_type, ref_id) WHERE ref_id IS NOT NULL DO NOTHING
    `,
    [employeeId, kind, points, mult > 1 ? `${note} · бонус тотема ×${mult.toFixed(2)}` : note, refType ?? null, refId ?? null]
  );
}

/** Тотем «Создатель Библии новичка»: любой сданный тест приносит владельцу тотема долю очков.
 *  Вызывается после начисления за тест самому сдавшему; идемпотентно по попытке. */
export async function awardQuizWitnessBonus(attemptId: string, passerId: string): Promise<void> {
  if (!(await isFeatureEnabled("totem_bonuses"))) return;
  const holders = await query<{ employee_id: string; bonus_pct: number }>(
    `SELECT employee_id::text, bonus_pct FROM totem_awards
     WHERE bonus_kind = 'quiz_any' AND bonus_pct <> 0
       AND (bonus_until IS NULL OR bonus_until >= (now() AT TIME ZONE 'Europe/Moscow')::date)`
  );
  for (const holder of holders.rows) {
    if (holder.employee_id === passerId) continue; // за свой же тест бонус не начисляем
    const points = Math.max(1, Math.round((PROGRESS_POINTS.quiz_passed * Number(holder.bonus_pct)) / 100));
    await query(
      `
        INSERT INTO progress_events (employee_id, kind, points, note, ref_type, ref_id)
        VALUES ($1, 'quiz_passed', $2, 'Тотем: коллега сдал тест по твоей Библии', 'totem_quiz', $3)
        ON CONFLICT (employee_id, ref_type, ref_id) WHERE ref_id IS NOT NULL DO NOTHING
      `,
      [holder.employee_id, points, attemptId]
    );
  }
}

/** Сколько раз сотруднику начислялись очки данного вида за последние `hours` часов. */
export async function countRecentAwards(
  employeeId: string,
  kind: keyof typeof PROGRESS_POINTS,
  hours: number
): Promise<number> {
  const result = await query<{ c: string }>(
    `SELECT COUNT(*)::text AS c FROM progress_events
     WHERE employee_id = $1 AND kind = $2 AND created_at > now() - ($3 || ' hours')::interval`,
    [employeeId, kind, String(hours)]
  );
  return Number(result.rows[0]?.c || 0);
}

/** Начислить очки всем активным сотрудникам указанной роли. */
export async function awardPointsToRole(
  role: string,
  kind: keyof typeof PROGRESS_POINTS,
  note: string,
  refType: string,
  refId: string
): Promise<void> {
  await query(
    `
      INSERT INTO progress_events (employee_id, kind, points, note, ref_type, ref_id)
      SELECT e.id, $2, $3, $4, $5, $6
      FROM employees e
      WHERE e.is_active = true AND e.archived_at IS NULL
        AND (e.role::text = $1 OR e.schedule_role = $1)
      ON CONFLICT (employee_id, ref_type, ref_id) WHERE ref_id IS NOT NULL DO NOTHING
    `,
    [role, kind, PROGRESS_POINTS[kind], note, refType, refId]
  );
}

async function getEventPoints(employeeId: string): Promise<number> {
  const result = await query<{ total: string }>(
    "SELECT COALESCE(SUM(points), 0)::text AS total FROM progress_events WHERE employee_id = $1",
    [employeeId]
  );
  return Number(result.rows[0]?.total || 0);
}

export async function getProgressSummary(employeeId: string, startDate: string | null) {
  const months = tenureMonths(startDate);
  const tenurePoints = months * TENURE_POINTS_PER_MONTH;
  const eventPoints = await getEventPoints(employeeId);
  const total = tenurePoints + eventPoints;
  const level = Math.floor(total / POINTS_PER_LEVEL) + 1;
  const progressPct = total % POINTS_PER_LEVEL;
  return {
    level,
    progressPct,
    toNextPct: POINTS_PER_LEVEL - progressPct,
    pointsTotal: total,
    tenureMonths: months,
    tenurePoints
  };
}

export function registerProgressRoutes(app: FastifyInstance): void {
  app.get("/api/progress", async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await requireUser(request, reply);
    if (!user) return;

    const emp = await query<{ start_date: string | null }>(
      "SELECT start_date::text FROM employees WHERE id = $1",
      [user.id]
    );
    const startDate = emp.rows[0]?.start_date ?? null;
    const summary = await getProgressSummary(user.id, startDate);

    const events = await query<{ kind: string; points: number; note: string | null; created_at: string }>(
      `
        SELECT kind, points, note, created_at::text
        FROM progress_events
        WHERE employee_id = $1
        ORDER BY created_at DESC
        LIMIT 200
      `,
      [user.id]
    );

    const history = events.rows.map((row) => ({
      kind: row.kind,
      label: KIND_LABELS[row.kind] || "Очки",
      note: row.note || "",
      points: row.points,
      createdAt: row.created_at
    }));
    if (summary.tenureMonths > 0) {
      history.push({
        kind: "tenure",
        label: KIND_LABELS.tenure,
        note: `${summary.tenureMonths} мес`,
        points: summary.tenurePoints,
        createdAt: ""
      });
    }

    // Тотемы сотрудника (до 2 шт.) — редкая именная награда по бокам от куклы.
    const totemRows = await query<{ slot: number; title: string; description: string; image_path: string; bonus_note: string; bonus_until: string | null }>(
      `SELECT slot, title, description, image_path, bonus_note, bonus_until::text
       FROM totem_awards
       WHERE employee_id = $1
       ORDER BY slot`,
      [user.id]
    );
    const bonusesOn = await isFeatureEnabled("totem_bonuses");
    const totems = totemRows.rows.map((row) => ({
      slot: row.slot,
      title: row.title,
      description: row.description || "",
      image: row.image_path,
      // Бонус показываем, только когда механика включена и срок действия не вышел.
      bonus: bonusesOn && row.bonus_note ? row.bonus_note : "",
      bonusUntil: bonusesOn ? row.bonus_until : null
    }));

    // Руководитель видит уровни команды (кроме мойщиц) — для сетки аватаров на странице прогресса.
    let team: Array<{ id: string; name: string; role: string; level: number }> | undefined;
    if (isManager(user)) {
      const teamRows = await query<{ id: string; name: string; role: string; start_date: string | null }>(
        `SELECT id::text, display_name AS name, role::text, start_date::text
         FROM employees
         WHERE is_active = true AND archived_at IS NULL
           AND role <> 'dishwasher'
           AND COALESCE(schedule_role, '') NOT IN ('dish', 'dishwasher')
         ORDER BY display_name`
      );
      team = await Promise.all(
        teamRows.rows.map(async (row) => ({
          id: row.id,
          name: row.name,
          role: row.role,
          level: (await getProgressSummary(row.id, row.start_date)).level
        }))
      );
      team.sort((a, b) => b.level - a.level || a.name.localeCompare(b.name, "ru"));
    }

    return { ...summary, history, team, totems };
  });

  // Неувиденные начисления опыта — для всплывающего окна «+N%». Пусто, если фича выключена.
  app.get("/api/progress/unseen", async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await requireUser(request, reply);
    if (!user) return;
    if (!(await isFeatureEnabled("xp_popup"))) return { items: [], total: 0 };

    const rows = await query<{ kind: string; points: number; note: string | null }>(
      `SELECT kind, points, note FROM progress_events
       WHERE employee_id = $1 AND seen_at IS NULL
       ORDER BY created_at
       LIMIT 20`,
      [user.id]
    );
    return {
      items: rows.rows.map((r) => ({
        kind: r.kind,
        label: KIND_LABELS[r.kind] || "Очки",
        note: r.note || "",
        points: Number(r.points || 0)
      })),
      total: rows.rows.reduce((s, r) => s + Number(r.points || 0), 0)
    };
  });

  // Пометить показанные начисления увиденными (после закрытия окна).
  app.post("/api/progress/seen", async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await requireUser(request, reply);
    if (!user) return;
    await query("UPDATE progress_events SET seen_at = now() WHERE employee_id = $1 AND seen_at IS NULL", [user.id]);
    return { ok: true };
  });

  app.post("/api/progress/plan-met", async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await requireUser(request, reply);
    if (!user) return;
    if (!isManager(user)) {
      await reply.code(403).send({ error: "forbidden" });
      return;
    }
    const already = await query<{ c: string }>(
      "SELECT COUNT(*)::text AS c FROM progress_events WHERE kind = 'plan_met' AND created_at::date = (now() AT TIME ZONE 'Europe/Moscow')::date"
    );
    if (Number(already.rows[0]?.c || 0) > 0) {
      return { ok: true, alreadyAwarded: true };
    }
    await query(
      `
        INSERT INTO progress_events (employee_id, kind, points, note)
        SELECT e.id, 'plan_met', $1, 'Общий план выполнен'
        FROM employees e
        WHERE e.is_active = true AND e.archived_at IS NULL
      `,
      [PROGRESS_POINTS.plan_met]
    );
    await audit(request, "progress_plan_met", user.id, "progress", undefined, {});
    return { ok: true };
  });
}
