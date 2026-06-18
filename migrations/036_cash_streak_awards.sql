-- Награда официанта за наличный план: серии из 5 смен подряд с выполненным планом
-- (наличная выручка ≥ ФОТ дня). Бонус 1.5% от наличных серии, пропорц. отработанным часам.
-- Выдаётся только вперёд (idempotent), уже выданные не отзываются. См. чат-обсуждение.
CREATE TABLE IF NOT EXISTS cash_streak_awards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  streak_end_date date NOT NULL,
  cash_sum numeric(14,2) NOT NULL DEFAULT 0,
  bonus_amount integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (employee_id, streak_end_date)
);
CREATE INDEX IF NOT EXISTS idx_cash_streak_emp ON cash_streak_awards (employee_id);
