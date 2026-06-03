ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS is_hookah_master boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hookah_rate integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS shift_closings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_date date NOT NULL UNIQUE,
  submitted_by uuid REFERENCES employees(id) ON DELETE SET NULL,
  hookah_employee_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('draft', 'submitted')),
  cash_diff_limit integer NOT NULL DEFAULT 500,
  taxi_limit integer NOT NULL DEFAULT 2000,
  revenue_plan integer NOT NULL DEFAULT 0,
  opening_cash_expected integer NOT NULL DEFAULT 0,
  opening_cash_actual integer NOT NULL DEFAULT 0,
  opening_cash_diff integer NOT NULL DEFAULT 0,
  terminal_1 integer NOT NULL DEFAULT 0,
  terminal_2 integer NOT NULL DEFAULT 0,
  netmonet integer NOT NULL DEFAULT 0,
  yandex_food integer NOT NULL DEFAULT 0,
  cashless_total integer NOT NULL DEFAULT 0,
  cash_revenue integer NOT NULL DEFAULT 0,
  transfer_revenue integer NOT NULL DEFAULT 0,
  revenue_total integer NOT NULL DEFAULT 0,
  wash_cost integer NOT NULL DEFAULT 0,
  hookah_count integer NOT NULL DEFAULT 0,
  hookah_rate integer NOT NULL DEFAULT 0,
  hookah_payout integer NOT NULL DEFAULT 0,
  taxi_amount integer NOT NULL DEFAULT 0,
  extra_expenses_total integer NOT NULL DEFAULT 0,
  collection_amount integer NOT NULL DEFAULT 0,
  closing_cash_actual integer NOT NULL DEFAULT 0,
  closing_cash_expected integer NOT NULL DEFAULT 0,
  closing_cash_diff integer NOT NULL DEFAULT 0,
  revenue_plan_percent numeric(7,2) NOT NULL DEFAULT 0,
  comment text NOT NULL DEFAULT '',
  submitted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shift_closing_extra_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_closing_id uuid NOT NULL REFERENCES shift_closings(id) ON DELETE CASCADE,
  amount integer NOT NULL CHECK (amount > 0),
  comment text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shift_closing_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_closing_id uuid NOT NULL REFERENCES shift_closings(id) ON DELETE CASCADE,
  photo_type text NOT NULL CHECK (photo_type IN ('terminal_1', 'terminal_2', 'shift_close', 'other')),
  filename text NOT NULL DEFAULT '',
  mime_type text NOT NULL DEFAULT '',
  size_bytes integer NOT NULL DEFAULT 0,
  data bytea NOT NULL,
  uploaded_by uuid REFERENCES employees(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shift_closing_telegram_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_closing_id uuid NOT NULL REFERENCES shift_closings(id) ON DELETE CASCADE,
  audience text NOT NULL CHECK (audience IN ('manager', 'team')),
  status text NOT NULL CHECK (status IN ('sent', 'failed', 'skipped')),
  format text NOT NULL DEFAULT 'text' CHECK (format IN ('text', 'photo')),
  message_text text NOT NULL DEFAULT '',
  telegram_message_id text,
  error text NOT NULL DEFAULT '',
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS shift_closings_work_date_idx ON shift_closings(work_date);
CREATE INDEX IF NOT EXISTS shift_closings_submitted_by_idx ON shift_closings(submitted_by);
CREATE INDEX IF NOT EXISTS shift_closing_photos_shift_idx ON shift_closing_photos(shift_closing_id);
CREATE INDEX IF NOT EXISTS shift_closing_telegram_reports_shift_idx ON shift_closing_telegram_reports(shift_closing_id);
