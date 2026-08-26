-- Бонусы тотемов: именная награда теперь может усиливать начисление очков прогресса.
-- bonus_kind — на что действует, bonus_pct — прибавка в процентах (100 = ×2),
-- bonus_until — дата окончания действия (NULL = бессрочно), bonus_note — текст для карточки.
-- Виды бонусов (обрабатываются в progress.ts):
--   all          — все начисления владельца тотема
--   shift        — свои закрытые смены
--   praise       — «спасибо»: и сказанные, и полученные
--   shift_streak — начисления в день 3-й смены подряд или в день возвращения после 3+ выходных
--   quiz_any     — любой сотрудник сдал тест → владельцу тотема отдельное начисление
ALTER TABLE totem_awards ADD COLUMN IF NOT EXISTS bonus_kind text;
ALTER TABLE totem_awards ADD COLUMN IF NOT EXISTS bonus_pct integer NOT NULL DEFAULT 0;
ALTER TABLE totem_awards ADD COLUMN IF NOT EXISTS bonus_until date;
ALTER TABLE totem_awards ADD COLUMN IF NOT EXISTS bonus_note text NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_totem_awards_bonus ON totem_awards (bonus_kind) WHERE bonus_kind IS NOT NULL;
