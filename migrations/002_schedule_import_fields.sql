ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS source_schedule_id text UNIQUE,
  ADD COLUMN IF NOT EXISTS schedule_role text,
  ADD COLUMN IF NOT EXISTS default_hours numeric(5,2),
  ADD COLUMN IF NOT EXISTS hourly_rate integer,
  ADD COLUMN IF NOT EXISTS pay_model text;

CREATE INDEX IF NOT EXISTS employees_source_schedule_id_idx ON employees(source_schedule_id);
CREATE INDEX IF NOT EXISTS employees_schedule_role_idx ON employees(schedule_role);

