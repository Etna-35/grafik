CREATE TABLE IF NOT EXISTS quiz_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id uuid REFERENCES training_chapters(id) ON DELETE CASCADE,
  module_id uuid REFERENCES training_modules(id) ON DELETE CASCADE,
  is_attestation boolean NOT NULL DEFAULT false,
  prompt text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (chapter_id IS NOT NULL OR (module_id IS NOT NULL AND is_attestation = true))
);

CREATE TABLE IF NOT EXISTS quiz_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
  label text NOT NULL,
  is_correct boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  scope_type text NOT NULL,
  scope_id uuid NOT NULL,
  total integer NOT NULL DEFAULT 0,
  correct integer NOT NULL DEFAULT 0,
  score_pct integer,
  passed boolean NOT NULL DEFAULT false,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);

CREATE INDEX IF NOT EXISTS quiz_questions_chapter_idx ON quiz_questions(chapter_id, is_active, sort_order);
CREATE INDEX IF NOT EXISTS quiz_questions_module_idx ON quiz_questions(module_id, is_attestation, is_active, sort_order);
CREATE INDEX IF NOT EXISTS quiz_attempts_lookup_idx ON quiz_attempts(employee_id, scope_type, scope_id, finished_at DESC);
