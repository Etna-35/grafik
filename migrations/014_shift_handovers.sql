CREATE TABLE IF NOT EXISTS shift_handovers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  audience text NOT NULL DEFAULT 'all',
  from_manager boolean NOT NULL DEFAULT false,
  body text NOT NULL,
  resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_shift_handovers_open ON shift_handovers (resolved, created_at DESC);
