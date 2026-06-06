ALTER TABLE requisition_lines ADD COLUMN IF NOT EXISTS urgent boolean NOT NULL DEFAULT false;
