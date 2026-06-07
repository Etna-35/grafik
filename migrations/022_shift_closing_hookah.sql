-- Несколько кальянщиков в одной смене.
-- Дочерняя таблица-список по образцу shift_closing_extra_expenses.
-- Колонки shift_closings.hookah_* остаются как денормализованный итог за смену
-- (hookah_count/hookah_payout = суммы; hookah_employee_id/hookah_rate = заполнены, когда кальянщик один).

CREATE TABLE IF NOT EXISTS shift_closing_hookah (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_closing_id uuid NOT NULL REFERENCES shift_closings(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
  count integer NOT NULL DEFAULT 0,
  rate integer NOT NULL DEFAULT 0,
  payout integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS shift_closing_hookah_employee_idx ON shift_closing_hookah(employee_id);
CREATE INDEX IF NOT EXISTS shift_closing_hookah_closing_idx ON shift_closing_hookah(shift_closing_id);

-- Перенос существующих одиночных кальянщиков в дочернюю таблицу (идемпотентно).
INSERT INTO shift_closing_hookah (shift_closing_id, employee_id, count, rate, payout, created_at)
SELECT sc.id, sc.hookah_employee_id, sc.hookah_count, sc.hookah_rate, sc.hookah_payout, sc.created_at
FROM shift_closings sc
WHERE sc.hookah_employee_id IS NOT NULL
  AND sc.hookah_payout > 0
  AND NOT EXISTS (
    SELECT 1 FROM shift_closing_hookah h WHERE h.shift_closing_id = sc.id
  );
