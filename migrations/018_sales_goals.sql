CREATE TABLE IF NOT EXISTS sales_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE,
  title text NOT NULL,
  target_qty integer NOT NULL CHECK (target_qty > 0),
  current_qty integer NOT NULL DEFAULT 0,
  reward_amount integer,
  status text NOT NULL DEFAULT 'active',
  work_date date NOT NULL DEFAULT (now() AT TIME ZONE 'Europe/Moscow')::date,
  created_by uuid REFERENCES employees(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  confirmed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_sales_goals_emp ON sales_goals (employee_id, status);
