-- Спецмероприятие («Корпоратив») на дне графика: краткая инфо, которую видит сотрудник по клику на дату.
-- Сама смена-корпоратив хранится в schedule_shifts с pay_model='event' и индивидуальной суммой (не почасовая).
ALTER TABLE schedule_days ADD COLUMN IF NOT EXISTS event_title text;
ALTER TABLE schedule_days ADD COLUMN IF NOT EXISTS event_note text;
