-- Отметка «сотрудник увидел начисление опыта» — для всплывающего окна «+N%».
-- Работает асинхронно: очки, начисленные пока человека не было в приложении
-- (например, руководитель принял задачу), покажутся при следующем входе.
ALTER TABLE progress_events ADD COLUMN IF NOT EXISTS seen_at timestamptz;

-- Всю прошлую историю считаем УВИДЕННОЙ, иначе при первом включении фичи
-- людям прилетит окно с сотнями старых начислений.
UPDATE progress_events SET seen_at = now() WHERE seen_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_progress_events_unseen ON progress_events (employee_id) WHERE seen_at IS NULL;
