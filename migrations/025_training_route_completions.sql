-- Отметка «Путь новичка пройден» на сотрудника (после этого маршрут стажёра скрывается).
CREATE TABLE IF NOT EXISTS training_route_completions (
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  route_id uuid NOT NULL REFERENCES training_routes(id) ON DELETE CASCADE,
  completed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (employee_id, route_id)
);
