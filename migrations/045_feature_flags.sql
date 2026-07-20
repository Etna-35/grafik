-- Фич-флаги для поэтапного включения новых функций: нет строки или enabled=false = фича выключена.
-- Включение после ручного теста: UPDATE feature_flags SET enabled=true WHERE code='...' (или PUT /api/admin/features).
CREATE TABLE IF NOT EXISTS feature_flags (
  code text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
