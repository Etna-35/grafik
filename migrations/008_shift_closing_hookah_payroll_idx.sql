CREATE INDEX IF NOT EXISTS shift_closings_hookah_employee_date_idx
  ON shift_closings(hookah_employee_id, work_date)
  WHERE hookah_employee_id IS NOT NULL;
