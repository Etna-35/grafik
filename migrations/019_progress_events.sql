CREATE TABLE IF NOT EXISTS progress_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE,
  kind text NOT NULL,
  points integer NOT NULL,
  note text,
  ref_type text,
  ref_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS progress_events_ref_idx
  ON progress_events (employee_id, ref_type, ref_id)
  WHERE ref_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS progress_events_emp_idx
  ON progress_events (employee_id, created_at DESC);
