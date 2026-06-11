-- Фактически закупленное количество по позиции (если отличается от запрошенного).
-- NULL = закуплено как просили; иначе — фактический объём, который купил руководитель.
ALTER TABLE requisition_lines ADD COLUMN IF NOT EXISTS purchased_qty numeric(10,2);
