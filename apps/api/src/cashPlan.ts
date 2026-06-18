import { query } from "./db.js";

// Награда официанта за наличный план. План дня выполнен, если наличная выручка закрытия
// (cash_revenue) ≥ ФОТ дня (сумма pay_amount по графику за день). Засчитывается официантам,
// работавшим в этот день. Серия = 5 подряд (по сменам официанта) выполненных планов →
// бонус 1.5% от наличных серии, делится пропорционально отработанным часам официантов дня.

export const STREAK_LEN = 5;
export const BONUS_PCT = 1.5;

const WAITER_FILTER = "(e.role::text = 'waiter' OR e.schedule_role = 'waiter')";

type ShiftRow = {
  work_date: string;
  cash_revenue: number;
  day_fot: number;
  my_hours: number | null;
  waiter_hours: number | null;
  waiter_count: number;
};

type SeqItem = { date: string; met: boolean; share: number };

// Упорядоченная последовательность смен официанта (только дни с закрытием) + флаг плана + его доля бонуса дня.
async function waiterSequence(employeeId: string): Promise<SeqItem[]> {
  const rows = await query<ShiftRow>(
    `
      SELECT ss.work_date::text,
             sc.cash_revenue,
             (SELECT COALESCE(SUM(pay_amount), 0) FROM schedule_shifts WHERE work_date = ss.work_date) AS day_fot,
             ss.planned_hours AS my_hours,
             (SELECT COALESCE(SUM(s2.planned_hours), 0) FROM schedule_shifts s2
                JOIN employees e ON e.id = s2.employee_id
                WHERE s2.work_date = ss.work_date AND ${WAITER_FILTER}) AS waiter_hours,
             (SELECT COUNT(*) FROM schedule_shifts s3
                JOIN employees e ON e.id = s3.employee_id
                WHERE s3.work_date = ss.work_date AND ${WAITER_FILTER})::int AS waiter_count
      FROM schedule_shifts ss
      JOIN shift_closings sc ON sc.work_date = ss.work_date
      WHERE ss.employee_id = $1
      ORDER BY ss.work_date
    `,
    [employeeId]
  );
  return rows.rows.map((r) => {
    const cash = Number(r.cash_revenue || 0);
    const met = cash >= Number(r.day_fot || 0) && Number(r.day_fot || 0) > 0;
    const myHours = Number(r.my_hours || 0);
    const waiterHours = Number(r.waiter_hours || 0);
    const count = Number(r.waiter_count || 1) || 1;
    // Доля дня: пропорц. часам; если часов нет — поровну между официантами дня.
    const frac = waiterHours > 0 && myHours > 0 ? myHours / waiterHours : 1 / count;
    const share = met ? Math.round((cash * BONUS_PCT) / 100 * frac) : 0;
    return { date: r.work_date, met, share };
  });
}

// Завершённые серии: каждые 5 подряд выполненных. Возвращает дату 5-й смены + бонус (сумма долей).
function completedStreaks(seq: SeqItem[]): Array<{ endDate: string; bonus: number; cashShareCount: number }> {
  const out: Array<{ endDate: string; bonus: number; cashShareCount: number }> = [];
  let run = 0;
  let bonus = 0;
  for (const item of seq) {
    if (item.met) {
      run += 1;
      bonus += item.share;
      if (run === STREAK_LEN) {
        out.push({ endDate: item.date, bonus, cashShareCount: STREAK_LEN });
        run = 0;
        bonus = 0;
      }
    } else {
      run = 0;
      bonus = 0;
    }
  }
  return out;
}

// Пересчёт серий официанта и выдача новых наград (только вперёд, idempotent по дате 5-й смены).
export async function recomputeWaiterStreaks(employeeId: string): Promise<void> {
  const seq = await waiterSequence(employeeId);
  const streaks = completedStreaks(seq);
  for (const s of streaks) {
    await query(
      `INSERT INTO cash_streak_awards (employee_id, streak_end_date, bonus_amount)
       VALUES ($1, $2, $3)
       ON CONFLICT (employee_id, streak_end_date) DO NOTHING`,
      [employeeId, s.endDate, s.bonus]
    );
  }
}

// Пересчёт для всех официантов, работавших в указанный день (вызывается при сохранении закрытия).
export async function recomputeStreaksForDate(workDate: string): Promise<void> {
  const waiters = await query<{ id: string }>(
    `SELECT ss.employee_id::text AS id
     FROM schedule_shifts ss JOIN employees e ON e.id = ss.employee_id
     WHERE ss.work_date = $1::date AND ${WAITER_FILTER}`,
    [workDate]
  );
  for (const w of waiters.rows) {
    await recomputeWaiterStreaks(w.id);
  }
}

// Статистика для ЛК официанта: смены с планом, кубки (серии), текущая серия.
export async function getWaiterCashStats(employeeId: string): Promise<{
  planShifts: number;
  trophies: number;
  currentStreak: number;
  streakToNext: number;
  bonusTotal: number;
} | null> {
  const empRow = await query<{ is_waiter: boolean }>(
    `SELECT ${WAITER_FILTER} AS is_waiter FROM employees e WHERE e.id = $1`,
    [employeeId]
  );
  if (!empRow.rows[0]?.is_waiter) return null;

  const seq = await waiterSequence(employeeId);
  const planShifts = seq.filter((s) => s.met).length;
  // Счётчики (смены/серии/текущая серия) — пожизненные, из всей истории (это статистика, без денег).
  let run = 0;
  let trophies = 0;
  for (const item of seq) {
    if (item.met) {
      run += 1;
      if (run === STREAK_LEN) {
        trophies += 1;
        run = 0;
      }
    } else {
      run = 0;
    }
  }
  // Деньги (фактически начисленный бонус) — только из выданных наград, начисляются ТОЛЬКО ВПЕРЁД.
  const bonusRow = await query<{ b: string }>(
    "SELECT COALESCE(SUM(bonus_amount), 0)::text AS b FROM cash_streak_awards WHERE employee_id = $1",
    [employeeId]
  );
  return {
    planShifts,
    trophies,
    currentStreak: run,
    streakToNext: STREAK_LEN - run,
    bonusTotal: Number(bonusRow.rows[0]?.b || 0)
  };
}

// Сумма премий за серии для месяца (для payroll). start = первое число месяца.
export async function streakRewardsForMonth(employeeId: string, start: string): Promise<{ total: number; count: number }> {
  const r = await query<{ total: string; count: string }>(
    `SELECT COALESCE(SUM(bonus_amount), 0)::text AS total, COUNT(*)::text AS count
     FROM cash_streak_awards
     WHERE employee_id = $1 AND streak_end_date >= $2::date AND streak_end_date < ($2::date + interval '1 month')`,
    [employeeId, start]
  );
  return { total: Number(r.rows[0]?.total || 0), count: Number(r.rows[0]?.count || 0) };
}
