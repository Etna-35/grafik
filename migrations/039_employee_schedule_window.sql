-- Окно участия сотрудника в графике (по месяцам): «в графике с» и «в графике по».
-- Хранятся как дата-первое-число месяца. NULL = без ограничения.
-- Историю это НЕ трогает: кто реально работал в месяце (есть смены), показывается всегда — см. schedule.ts.
ALTER TABLE employees ADD COLUMN IF NOT EXISTS schedule_from date;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS schedule_until date;
