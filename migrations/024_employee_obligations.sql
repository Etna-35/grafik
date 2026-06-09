-- Личные обязательства руководителя перед сотрудником («я помню, сколько должен»).
-- Сотрудник видит остаток и как он уменьшается. Не «долг», а памятка к выплате.
CREATE TABLE IF NOT EXISTS employee_obligations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  title text NOT NULL,
  amount_total integer NOT NULL CHECK (amount_total >= 0),
  amount_paid integer NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
  note text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES employees(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS employee_obligations_emp_idx
  ON employee_obligations (employee_id, is_active);
