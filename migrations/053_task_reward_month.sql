-- Месяц учёта премии отдельно от фактической даты приёмки задачи.
-- NULL сохраняет прежнее поведение: месяц approved_at, без переноса старых начислений.
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reward_month date;
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_reward_month_first_day;
ALTER TABLE tasks ADD CONSTRAINT tasks_reward_month_first_day
  CHECK (reward_month IS NULL OR EXTRACT(DAY FROM reward_month) = 1);
