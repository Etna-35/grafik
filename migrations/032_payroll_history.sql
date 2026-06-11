-- Ручная история ЗП за прошлые месяцы (нет календаря): смены/часы/начислено на сотрудника.
CREATE TABLE IF NOT EXISTS payroll_history (
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  period_month date NOT NULL,
  shifts integer NOT NULL DEFAULT 0,
  hours numeric(8,2) NOT NULL DEFAULT 0,
  accrued integer NOT NULL DEFAULT 0,
  PRIMARY KEY (employee_id, period_month)
);
