CREATE TABLE IF NOT EXISTS praises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  to_id uuid REFERENCES employees(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_praises_created ON praises (created_at DESC);
