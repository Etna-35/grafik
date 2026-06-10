-- Отметка «закуплено» по каждой позиции заявки (руководитель ставит галочки).
ALTER TABLE requisition_lines ADD COLUMN IF NOT EXISTS purchased boolean NOT NULL DEFAULT false;
