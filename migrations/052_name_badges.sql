-- Знаков у имени может быть несколько (например «Основатель ЭТНА» + «Победившие смуту»).
-- Слоты 1–2 — личные тотемы по бокам от куклы, слоты 3–6 — значки у имени приветствия.
ALTER TABLE totem_awards DROP CONSTRAINT IF EXISTS totem_awards_slot_check;
ALTER TABLE totem_awards ADD CONSTRAINT totem_awards_slot_check CHECK (slot BETWEEN 1 AND 6);

-- «Победившие смуту» — фиксация момента, а не личная заслуга: переносим к имени.
UPDATE totem_awards SET placement = 'name', slot = 4 WHERE title = 'Победившие смуту';
