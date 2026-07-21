-- Чаевые: сотрудник (официант/бармен) сам ведёт свои суммы по дням.
-- ВАЖНО: чаевые — деньги гостя, а НЕ обязательство ресторана. Они идут в «доход» сотрудника
-- (как кальяны), но НИКОГДА не попадают в «остаток к выплате», ФОТ, P&L и Кассу.
CREATE TABLE IF NOT EXISTS employee_tips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  work_date date NOT NULL,
  amount integer NOT NULL CHECK (amount >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (employee_id, work_date)
);
CREATE INDEX IF NOT EXISTS idx_employee_tips_emp_date ON employee_tips (employee_id, work_date);

-- Личная цель по чаевым на месяц. ПРИВАТНО: видна только самому сотруднику (руководителю не отдаём).
CREATE TABLE IF NOT EXISTS employee_tip_goals (
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  period_month date NOT NULL,
  amount integer NOT NULL CHECK (amount > 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (employee_id, period_month)
);
