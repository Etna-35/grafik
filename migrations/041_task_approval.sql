-- Подтверждение приёмки личной задачи руководителем. До одобрения (approved_at IS NULL)
-- премия НЕ учитывается в доходе, ТГ-сообщение не шлётся, очки прогресса не начисляются.
-- status='done' теперь = «сотрудник отметил выполнение» (на проверке); approved_at = «принято».
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS approved_at timestamptz;

-- Бэкфилл: всё, что уже отмечено выполненным до внедрения приёмки, считаем принятым —
-- чтобы премии прошлого/текущего периода не выпали из дохода и не «зависли на проверке».
UPDATE tasks SET approved_at = COALESCE(updated_at, created_at)
WHERE status = 'done' AND approved_at IS NULL;
