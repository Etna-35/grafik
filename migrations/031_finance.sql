-- Финансы руководителя: постоянные ежемесячные платежи и разовые расходы (для таблицы P&L).
CREATE TABLE IF NOT EXISTS finance_fixed (
  article text PRIMARY KEY,
  amount integer NOT NULL DEFAULT 0,
  comment text,
  updated_by uuid REFERENCES employees(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS finance_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_date date NOT NULL DEFAULT (now() AT TIME ZONE 'Europe/Moscow')::date,
  article text NOT NULL,
  amount integer NOT NULL CHECK (amount > 0),
  comment text,
  created_by uuid REFERENCES employees(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS finance_expenses_month_idx ON finance_expenses (entry_date, article);
