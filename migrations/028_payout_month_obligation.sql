-- Выплата может относиться к указанному месяцу (apply_month) и/или гасить личное обязательство.
ALTER TABLE payroll_payouts ADD COLUMN IF NOT EXISTS apply_month date;
ALTER TABLE payroll_payouts ADD COLUMN IF NOT EXISTS obligation_id uuid REFERENCES employee_obligations(id) ON DELETE SET NULL;
