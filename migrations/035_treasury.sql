-- Касса — планировщик cash-flow (owner-only). См. docs/treasury-planner.md. Фаза 1.
-- Якорь остатка, точки платежей, настройки (ставки конвертов + подушка), факт трат.

CREATE TABLE IF NOT EXISTS treasury_balance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  balance numeric(14,2) NOT NULL,
  as_of date NOT NULL,
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_treasury_balance_asof ON treasury_balance (as_of DESC, created_at DESC);

-- Одна строка настроек (id фиксирован в коде). purchase_pct/household_pct — ставки конвертов,
-- safety_buffer — подушка (фикс сумма), accrual_start — с какой даты копятся конверты.
CREATE TABLE IF NOT EXISTS treasury_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  purchase_pct numeric(5,2) NOT NULL DEFAULT 30,
  household_pct numeric(5,2) NOT NULL DEFAULT 5,
  safety_buffer numeric(14,2) NOT NULL DEFAULT 0,
  accrual_start date NOT NULL DEFAULT date_trunc('month', (now() AT TIME ZONE 'Europe/Moscow'))::date,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO treasury_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS treasury_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  amount numeric(14,2) NOT NULL,
  due_date date NOT NULL,
  category text NOT NULL DEFAULT 'other',
  priority int NOT NULL DEFAULT 100,
  splittable boolean NOT NULL DEFAULT true,
  recurring text NOT NULL DEFAULT 'none',
  status text NOT NULL DEFAULT 'planned',
  parent_id uuid REFERENCES treasury_payments(id) ON DELETE SET NULL,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_treasury_payments_due ON treasury_payments (due_date);

-- Факт трат. kind: food=продукты(кухня+бар), household=хозка, personal=личные с р/с, other=форс-мажор.
-- food/household списывают одноимённые конверты; personal/other уменьшают свободное/резерв.
CREATE TABLE IF NOT EXISTS treasury_spend (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('food', 'household', 'personal', 'other')),
  amount numeric(14,2) NOT NULL,
  spent_on date NOT NULL,
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_treasury_spend_on ON treasury_spend (spent_on);
