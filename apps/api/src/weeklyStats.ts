import type { FastifyInstance } from "fastify";
import { requireUser } from "./auth.js";
import { query } from "./db.js";

// Еженедельная «движуха»: мотивационно-развлекательный дайджест за ПРОШЕДШУЮ неделю (Пн–Вс, МСК).
// Показывается в ЛК всю текущую неделю + раз в неделю постится ботом в общий чат (см. cron.ts).
// Победители — только активные сотрудники (без архивных и без роли owner).

export type WeeklyItem = {
  key: string;
  label: string; // короткая золотая метка (без emoji — для ЛК)
  emoji: string; // для Telegram
  name: string;
  detail: string; // мотивационная строка-подпись
  value: number;
};

export type WeeklyDigest = {
  weekStart: string;
  weekEnd: string;
  items: WeeklyItem[];
};

type TopRow = { name: string; value: number };

const EMPLOYEE_FILTER = "e.is_active = true AND e.archived_at IS NULL AND e.role <> 'owner'";

// Границы прошедшей недели в МСК: прошлый понедельник .. прошлое воскресенье.
async function weekBounds(): Promise<{ start: string; end: string }> {
  const res = await query<{ start: string; end: string }>(
    `
      SELECT
        (date_trunc('week', (now() AT TIME ZONE 'Europe/Moscow')) - interval '7 days')::date::text AS start,
        (date_trunc('week', (now() AT TIME ZONE 'Europe/Moscow')) - interval '1 day')::date::text AS end
    `
  );
  return { start: res.rows[0].start, end: res.rows[0].end };
}

async function topPraisesGiven(start: string, end: string): Promise<TopRow | null> {
  const r = await query<TopRow>(
    `
      SELECT e.display_name AS name, COUNT(*)::int AS value
      FROM praises p
      JOIN employees e ON e.id = p.from_id
      WHERE (p.created_at AT TIME ZONE 'Europe/Moscow')::date BETWEEN $1 AND $2
        AND ${EMPLOYEE_FILTER}
      GROUP BY e.id, e.display_name
      ORDER BY value DESC, e.display_name
      LIMIT 1
    `,
    [start, end]
  );
  return r.rows[0] || null;
}

async function topPraisesReceived(start: string, end: string): Promise<TopRow | null> {
  const r = await query<TopRow>(
    `
      SELECT e.display_name AS name, COUNT(*)::int AS value
      FROM praises p
      JOIN employees e ON e.id = p.to_id
      WHERE (p.created_at AT TIME ZONE 'Europe/Moscow')::date BETWEEN $1 AND $2
        AND ${EMPLOYEE_FILTER}
      GROUP BY e.id, e.display_name
      ORDER BY value DESC, e.display_name
      LIMIT 1
    `,
    [start, end]
  );
  return r.rows[0] || null;
}

async function topProgressPoints(start: string, end: string): Promise<TopRow | null> {
  const r = await query<TopRow>(
    `
      SELECT e.display_name AS name, SUM(pe.points)::int AS value
      FROM progress_events pe
      JOIN employees e ON e.id = pe.employee_id
      WHERE (pe.created_at AT TIME ZONE 'Europe/Moscow')::date BETWEEN $1 AND $2
        AND ${EMPLOYEE_FILTER}
      GROUP BY e.id, e.display_name
      HAVING SUM(pe.points) > 0
      ORDER BY value DESC, e.display_name
      LIMIT 1
    `,
    [start, end]
  );
  return r.rows[0] || null;
}

async function topLearner(start: string, end: string): Promise<TopRow | null> {
  const r = await query<TopRow>(
    `
      SELECT e.display_name AS name, COUNT(*)::int AS value
      FROM progress_events pe
      JOIN employees e ON e.id = pe.employee_id
      WHERE pe.kind IN ('quiz_passed', 'attestation_passed', 'chapter_read', 'challenge_test')
        AND (pe.created_at AT TIME ZONE 'Europe/Moscow')::date BETWEEN $1 AND $2
        AND ${EMPLOYEE_FILTER}
      GROUP BY e.id, e.display_name
      ORDER BY value DESC, e.display_name
      LIMIT 1
    `,
    [start, end]
  );
  return r.rows[0] || null;
}

// «Мастер продаж»: достигнутые цели продаж + полученные кэш-серии официантов за неделю.
async function topSales(start: string, end: string): Promise<TopRow | null> {
  const r = await query<TopRow>(
    `
      SELECT e.display_name AS name, COUNT(*)::int AS value
      FROM (
        SELECT employee_id, created_at FROM progress_events WHERE kind = 'sales_goal'
        UNION ALL
        SELECT employee_id, created_at FROM cash_streak_awards
      ) x
      JOIN employees e ON e.id = x.employee_id
      WHERE (x.created_at AT TIME ZONE 'Europe/Moscow')::date BETWEEN $1 AND $2
        AND ${EMPLOYEE_FILTER}
      GROUP BY e.id, e.display_name
      ORDER BY value DESC, e.display_name
      LIMIT 1
    `,
    [start, end]
  );
  return r.rows[0] || null;
}

function pluralRu(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

export async function getWeeklyDigest(): Promise<WeeklyDigest> {
  const { start, end } = await weekBounds();
  const [given, received, mvp, learner, sales] = await Promise.all([
    topPraisesGiven(start, end),
    topPraisesReceived(start, end),
    topProgressPoints(start, end),
    topLearner(start, end),
    topSales(start, end)
  ]);

  const items: WeeklyItem[] = [];

  if (given) {
    const word = pluralRu(given.value, "спасибо", "спасибо", "спасибо");
    items.push({
      key: "grateful",
      label: "Самый благодарный",
      emoji: "🙏",
      name: given.name,
      detail: `${given.name} чаще всех говорил спасибо коллегам (${given.value} ${word}).`,
      value: given.value
    });
  }

  if (received) {
    items.push({
      key: "praised",
      label: "Любимчик недели",
      emoji: "💛",
      name: received.name,
      detail: `${received.name}, на этой неделе тебе все благодарны (${received.value} ${pluralRu(received.value, "спасибо", "спасибо", "спасибо")}).`,
      value: received.value
    });
  }

  if (mvp) {
    items.push({
      key: "mvp",
      label: "MVP недели",
      emoji: "🏆",
      name: mvp.name,
      detail: `${mvp.name} набрал больше всех очков прогресса (${mvp.value}).`,
      value: mvp.value
    });
  }

  if (learner) {
    const word = pluralRu(learner.value, "достижение", "достижения", "достижений");
    items.push({
      key: "learner",
      label: "Знаток недели",
      emoji: "📚",
      name: learner.name,
      detail: `${learner.name} грыз гранит науки: ${learner.value} ${word} в обучении.`,
      value: learner.value
    });
  }

  if (sales) {
    const word = pluralRu(sales.value, "достижение", "достижения", "достижений");
    items.push({
      key: "sales",
      label: "Мастер продаж",
      emoji: "💰",
      name: sales.name,
      detail: `${sales.name} — лучшие продажи недели (${sales.value} ${word}).`,
      value: sales.value
    });
  }

  return { weekStart: start, weekEnd: end, items };
}

// Формат для Telegram (HTML, с emoji). null — если за неделю нечего показать.
export function formatWeeklyDigestTelegram(digest: WeeklyDigest): string | null {
  if (!digest.items.length) return null;
  const fmt = (iso: string) => {
    const d = new Date(`${iso}T00:00:00`);
    return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", timeZone: "Europe/Moscow" }).format(d);
  };
  const lines = [
    `🔥 <b>Итоги недели</b>`,
    `<i>${fmt(digest.weekStart)} — ${fmt(digest.weekEnd)}</i>`,
    ``
  ];
  for (const item of digest.items) {
    lines.push(`${item.emoji} <b>${item.label}</b>`, item.detail, ``);
  }
  lines.push(`Спасибо, что делаете Etna лучше 💪`);
  return lines.join("\n");
}

export function registerWeeklyStatsRoutes(app: FastifyInstance): void {
  app.get("/api/weekly-stats", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return;
    return getWeeklyDigest();
  });
}
