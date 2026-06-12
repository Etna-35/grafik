-- Тотемы — редкая именная награда, до 2 штук на сотрудника. Показываются по бокам
-- от куклы вуду на странице прогресса. Выдаются вручную (без UI): строка в таблице
-- + картинка в apps/web/assets/totems/. slot 1 = слева от куклы, slot 2 = справа.
CREATE TABLE IF NOT EXISTS totem_awards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  slot smallint NOT NULL CHECK (slot IN (1, 2)),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  image_path text NOT NULL,
  awarded_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (employee_id, slot)
);

CREATE INDEX IF NOT EXISTS idx_totem_awards_emp ON totem_awards (employee_id);
