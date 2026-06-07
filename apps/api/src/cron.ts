import { query } from "./db.js";
import { PUBLIC_BASE_URL, sendMessage, teamChatId } from "./telegram.js";

// Простой планировщик: раз в минуту проверяет МСК-время. В 11:11 один раз в день
// шлёт в общий чат план по выручке/наличным на сегодня и план на завтра (если есть).
// Проект не высоконагруженный — отдельный шедулер не нужен.

let lastDailyFired = "";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function mskNow(): { hh: number; mm: number; date: string } {
  const d = new Date(Date.now() + 3 * 60 * 60 * 1000);
  return {
    hh: d.getUTCHours(),
    mm: d.getUTCMinutes(),
    date: `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
  };
}

async function sendDailyPlan(today: string): Promise<void> {
  if (!teamChatId()) return;

  const fotRow = await query<{ fot: string }>(
    `SELECT COALESCE(SUM(pay_amount), 0)::text AS fot FROM schedule_shifts WHERE work_date = $1::date`,
    [today]
  );
  const fot = Number(fotRow.rows[0]?.fot || 0);
  const revenuePlan = fot > 0 ? Math.round(fot / 0.23) : 0;
  const cashPlan = fot;
  const fmt = (n: number) => Math.round(n).toLocaleString("ru-RU");

  const handover = await query<{ mgr: boolean; cook: boolean; bar: boolean }>(
    `
      SELECT
        COALESCE(bool_or(from_manager), false) AS mgr,
        COALESCE(bool_or(audience = 'cook'), false) AS cook,
        COALESCE(bool_or(audience = 'bar'), false) AS bar
      FROM shift_handovers
      WHERE resolved = false
    `
  );
  const h = handover.rows[0] || { mgr: false, cook: false, bar: false };
  const kuhnyaActive = h.mgr || h.cook;
  const barActive = h.mgr || h.bar;

  const lines = [
    `🌅 <b>План на сегодня</b>`,
    ``,
    `Выручка: ${fmt(revenuePlan)} ₽`,
    `Наличные: ${fmt(cashPlan)} ₽`
  ];
  if (kuhnyaActive || barActive) {
    const link = (label: string, active: boolean) =>
      active ? `<a href="${PUBLIC_BASE_URL}/tasks">${label}</a>` : label;
    lines.push(``, `План на завтра: ${link("КУХНЯ", kuhnyaActive)}, ${link("БАР", barActive)}`);
  }

  await sendMessage(teamChatId(), lines.join("\n"));
}

async function tick(): Promise<void> {
  try {
    const { hh, mm, date } = mskNow();
    if (hh === 11 && mm >= 11 && lastDailyFired !== date) {
      lastDailyFired = date;
      await sendDailyPlan(date);
    }
  } catch {
    // планировщик не должен ронять процесс
  }
}

export function startCron(): void {
  setInterval(() => {
    void tick();
  }, 60 * 1000);
}
