CREATE TABLE IF NOT EXISTS training_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  audience_role employee_role,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS training_chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES training_modules(id) ON DELETE CASCADE,
  slug text NOT NULL,
  title text NOT NULL,
  summary text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  source_ref text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (module_id, slug)
);

CREATE TABLE IF NOT EXISTS training_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id uuid NOT NULL REFERENCES training_chapters(id) ON DELETE CASCADE,
  slug text NOT NULL,
  title text NOT NULL,
  kind text NOT NULL DEFAULT 'link',
  url text,
  description text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (chapter_id, slug)
);

CREATE TABLE IF NOT EXISTS training_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  audience_role employee_role,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS training_route_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id uuid NOT NULL REFERENCES training_routes(id) ON DELETE CASCADE,
  day_number integer NOT NULL CHECK (day_number > 0),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (route_id, day_number)
);

CREATE TABLE IF NOT EXISTS training_route_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_day_id uuid NOT NULL REFERENCES training_route_days(id) ON DELETE CASCADE,
  chapter_id uuid REFERENCES training_chapters(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS training_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  module_id uuid REFERENCES training_modules(id) ON DELETE CASCADE,
  route_id uuid REFERENCES training_routes(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES employees(id) ON DELETE SET NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  CHECK (module_id IS NOT NULL OR route_id IS NOT NULL),
  UNIQUE (employee_id, module_id, route_id)
);

CREATE TABLE IF NOT EXISTS training_read_marks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  chapter_id uuid NOT NULL REFERENCES training_chapters(id) ON DELETE CASCADE,
  read_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (employee_id, chapter_id)
);

CREATE INDEX IF NOT EXISTS training_chapters_module_sort_idx ON training_chapters(module_id, is_active, sort_order);
CREATE INDEX IF NOT EXISTS training_attachments_chapter_sort_idx ON training_attachments(chapter_id, is_active, sort_order);
CREATE INDEX IF NOT EXISTS training_route_days_route_sort_idx ON training_route_days(route_id, sort_order);
CREATE INDEX IF NOT EXISTS training_route_items_day_sort_idx ON training_route_items(route_day_id, sort_order);
CREATE INDEX IF NOT EXISTS training_read_marks_employee_idx ON training_read_marks(employee_id, read_at DESC);
CREATE INDEX IF NOT EXISTS training_read_marks_chapter_idx ON training_read_marks(chapter_id);
CREATE UNIQUE INDEX IF NOT EXISTS training_assignments_employee_module_idx
  ON training_assignments(employee_id, module_id)
  WHERE module_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS training_assignments_employee_route_idx
  ON training_assignments(employee_id, route_id)
  WHERE route_id IS NOT NULL;

INSERT INTO services (code, title, url, is_active)
VALUES ('training', 'Обучение', '/training', true)
ON CONFLICT (code) DO UPDATE
SET title = excluded.title,
    url = excluded.url,
    is_active = true;

INSERT INTO employee_service_access (employee_id, service_id, can_view, can_edit)
SELECT e.id, s.id, true, e.role IN ('owner', 'manager')
FROM employees e
JOIN services s ON s.code = 'training'
WHERE e.is_active = true
  AND e.role IN ('owner', 'manager', 'waiter')
ON CONFLICT (employee_id, service_id) DO UPDATE
SET can_view = true,
    can_edit = employee_service_access.can_edit OR excluded.can_edit;
