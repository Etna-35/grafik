-- Переводы от клиентов на личные карты сотрудников.
-- Хранятся как список строк по образцу shift_closing_hookah.
-- В выручку (revenue_total) входят, на остаток наличных в кассе НЕ влияют.
-- Колонка shift_closings.transfer_revenue остаётся как денормализованная сумма (Σ amount).

CREATE TABLE IF NOT EXISTS shift_closing_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_closing_id uuid NOT NULL REFERENCES shift_closings(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
  amount integer NOT NULL CHECK (amount > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS shift_closing_transfers_closing_idx ON shift_closing_transfers(shift_closing_id);
CREATE INDEX IF NOT EXISTS shift_closing_transfers_employee_idx ON shift_closing_transfers(employee_id);
