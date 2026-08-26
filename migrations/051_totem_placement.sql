-- Знак у имени: та же сущность, что тотем, но показывается не на странице прогресса,
-- а иконкой рядом с приветствием в ЛК. Слот 3 зарезервирован под такие знаки.
-- Бонусы у знаков — описательные (текст в bonus_note), логики начисления у них нет.
ALTER TABLE totem_awards DROP CONSTRAINT IF EXISTS totem_awards_slot_check;
ALTER TABLE totem_awards ADD CONSTRAINT totem_awards_slot_check CHECK (slot IN (1, 2, 3));
ALTER TABLE totem_awards ADD COLUMN IF NOT EXISTS placement text NOT NULL DEFAULT 'progress';
