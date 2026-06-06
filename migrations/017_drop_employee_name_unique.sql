-- Разрешаем одинаковые имена сотрудников: тёзки бывают, различия задаёт руководитель вручную.
ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_display_name_key;
