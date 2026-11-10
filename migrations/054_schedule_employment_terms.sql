-- Должность в графике и базовая ставка с месяца. Роль доступа employees.role не меняется.
-- Существующие смены, начисления и выплаты миграция не изменяет.
CREATE TABLE IF NOT EXISTS schedule_employment_terms (
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  effective_month date NOT NULL CHECK (extract(day FROM effective_month) = 1),
  schedule_role text NOT NULL CHECK (schedule_role IN ('cook', 'bar', 'waiter', 'dish', 'other')),
  hourly_rate int CHECK (hourly_rate >= 0 AND hourly_rate <= 100000),
  created_by uuid REFERENCES employees(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (employee_id, effective_month),
  CHECK (effective_month = '1900-01-01' OR schedule_role = 'dish' OR (hourly_rate IS NOT NULL AND hourly_rate > 0))
);

CREATE OR REPLACE FUNCTION schedule_role_on(employee uuid, work_day date) RETURNS text
LANGUAGE sql STABLE AS $$
  SELECT COALESCE(
    (SELECT t.schedule_role FROM schedule_employment_terms t
     WHERE t.employee_id = e.id AND t.effective_month <= work_day
     ORDER BY t.effective_month DESC LIMIT 1),
    e.schedule_role, CASE WHEN e.role::text = 'dishwasher' THEN 'dish' ELSE e.role::text END)
  FROM employees e WHERE e.id = employee
$$;

CREATE OR REPLACE FUNCTION schedule_rate_on(employee uuid, work_day date) RETURNS int
LANGUAGE sql STABLE AS $$
  SELECT CASE WHEN t.employee_id IS NOT NULL THEN t.hourly_rate ELSE e.hourly_rate END
  FROM employees e LEFT JOIN LATERAL (
    SELECT employee_id, hourly_rate FROM schedule_employment_terms
    WHERE employee_id = e.id AND effective_month <= work_day ORDER BY effective_month DESC LIMIT 1
  ) t ON true WHERE e.id = employee
$$;

-- Наличный план: после первого перевода учитываем фактическую должность дня.
-- До перевода сохраняем прежний алгоритм, чтобы не пересчитать старые серии задним числом.
CREATE OR REPLACE FUNCTION schedule_is_waiter_on(employee uuid, work_day date, day_role text) RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT CASE WHEN EXISTS (
    SELECT 1 FROM schedule_employment_terms t WHERE t.employee_id = e.id
      AND t.effective_month > '1900-01-01' AND t.effective_month <= work_day
  ) THEN COALESCE(day_role, schedule_role_on(e.id, work_day)) = 'waiter'
    ELSE (e.role::text = 'waiter' OR e.schedule_role = 'waiter') END
  FROM employees e WHERE e.id = employee
$$;
