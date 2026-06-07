import { pool } from "./db.js";
import { oldClosings } from "./data/oldClosings.js";

// Импорт исторических закрытий смен из старой Google-таблицы.
// Берём основные финансовые метрики. Кальяны — только денормализованный итог (кто кальянщик — неизвестно,
// строки shift_closing_hookah НЕ создаём). Переводы в источнике = 0, разбивку не создаём.
// netmonet в старой форме не было → 0. Авторитетные итоги («Безнал итого», «Выручка итого») берём как есть.
// Идемпотентно: ON CONFLICT (work_date) DO NOTHING.

function num(value: string | undefined): number {
  const n = Number(String(value ?? "").replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? Math.round(n) : 0;
}

function isoDate(ddmmyyyy: string): string {
  const [d, m, y] = ddmmyyyy.split(".");
  return `${y}-${m}-${d}`;
}

async function main(): Promise<void> {
  let inserted = 0;
  let skipped = 0;
  for (const row of oldClosings) {
    const workDate = isoDate(row[0]);
    const terminal1 = num(row[6]);
    const terminal2 = num(row[7]);
    const yandexFood = num(row[8]);
    const cashlessTotal = num(row[9]); // авторитетный «Безнал итого» из таблицы
    const cashRevenue = num(row[10]);
    const transferRevenue = num(row[11]);
    const revenueTotal = num(row[12]); // авторитетная «Выручка итого»
    const taxi = num(row[13]);
    const wash = num(row[14]);
    const hookahCount = num(row[15]);
    const hookahPayout = num(row[16]);
    const extra = num(row[17]);
    const collection = num(row[18]);
    const openingExpected = num(row[3]);
    const openingActual = num(row[4]);
    const openingDiff = num(row[5]);
    const closingActual = num(row[19]);
    const closingExpected = num(row[21]);
    const closingDiff = num(row[22]);
    const revenuePlan = num(row[23]);
    const revenuePlanPercent = revenuePlan > 0 ? Math.round((revenueTotal / revenuePlan) * 10000) / 100 : 0;

    const result = await pool.query(
      `
        INSERT INTO shift_closings (
          work_date, submitted_by, hookah_employee_id, cash_diff_limit, taxi_limit, revenue_plan,
          opening_cash_expected, opening_cash_actual, opening_cash_diff,
          terminal_1, terminal_2, netmonet, yandex_food, cashless_total,
          cash_revenue, transfer_revenue, revenue_total, wash_cost,
          hookah_count, hookah_rate, hookah_payout, taxi_amount, extra_expenses_total, collection_amount,
          closing_cash_actual, closing_cash_expected, closing_cash_diff, revenue_plan_percent, comment
        )
        VALUES (
          $1::date, NULL, NULL, 500, 2000, $2,
          $3, $4, $5,
          $6, $7, 0, $8, $9,
          $10, $11, $12, $13,
          $14, 0, $15, $16, $17, $18,
          $19, $20, $21, $22, 'Импорт из старой таблицы'
        )
        ON CONFLICT (work_date) DO NOTHING
      `,
      [
        workDate, revenuePlan,
        openingExpected, openingActual, openingDiff,
        terminal1, terminal2, yandexFood, cashlessTotal,
        cashRevenue, transferRevenue, revenueTotal, wash,
        hookahCount, hookahPayout, taxi, extra, collection,
        closingActual, closingExpected, closingDiff, revenuePlanPercent
      ]
    );
    if (result.rowCount && result.rowCount > 0) inserted++;
    else skipped++;
  }
  console.log(`Old closings import done: inserted ${inserted}, skipped ${skipped} (already present)`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
