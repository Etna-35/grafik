-- Сумма планируемой выплаты в «дне зарплаты». NULL = день отмечен, сумма не задана.
-- Сотрудник видит свою сумму по тапу на отмеченной ячейке графика (окно как у корпоратива).
ALTER TABLE payroll_planned_days ADD COLUMN IF NOT EXISTS amount integer;
