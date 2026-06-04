# Модель данных ЛК Etna

Документ фиксирует стартовую модель данных для `Postgres`. Это не финальная SQL-схема, а технический каркас, от которого дальше пишем миграции и API.

## Основные сущности

### employees

Сотрудники.

Поля:

- `id`;
- `display_name`;
- `role`;
- `is_active`;
- `is_hookah_master`;
- `hookah_rate`;
- `created_at`;
- `updated_at`.

Роли на старте:

- `owner` - руководитель;
- `manager` - управляющий/администратор;
- `cook`;
- `bar`;
- `waiter`;
- `dishwasher`;
- `other`.

### employee_auth

Данные входа.

Поля:

- `employee_id`;
- `pin_hash`;
- `pin_changed_at`;
- `failed_attempts`;
- `locked_until`.

PIN в открытом виде не хранится.

### services

Справочник сервисов личного кабинета.

Примеры:

- `schedule` - график;
- `shift_close` - закрытие смены;
- `tasks` - задания;
- `training` - обучение и база знаний;
- `requisition` - заявка продуктов и хозтоваров;
- `payroll` - выплаты и начисления;
- `admin` - руководительские разделы.

Поля:

- `id`;
- `code`;
- `title`;
- `url`;
- `is_active`.

### employee_service_access

Какие сервисы доступны конкретному сотруднику.

Поля:

- `employee_id`;
- `service_id`;
- `can_view`;
- `can_edit`;
- `created_at`.

Пример: раздел `Закрытие смены` доступен только двум сотрудникам, остальные его не видят.

## График

### schedule_days

Дни календаря.

Поля:

- `id`;
- `work_date`;
- `is_deadline`;
- `created_at`;
- `updated_at`.

### schedule_shifts

Смена сотрудника в конкретный день.

Поля:

- `id`;
- `work_date`;
- `employee_id`;
- `planned_start_time`;
- `planned_end_time`;
- `planned_hours`;
- `actual_end_time`;
- `pay_amount`;
- `pay_model`;
- `created_by`;
- `updated_by`;
- `created_at`;
- `updated_at`.

Правило: сотрудник может изменить `actual_end_time` только в меньшую сторону относительно запланированного окончания. Руководитель может редактировать полностью.

### payroll_planned_days

Назначенные дни зарплаты.

Поля:

- `id`;
- `work_date`;
- `employee_id`;
- `created_by`;
- `created_at`.

В интерфейсе отображается рамкой ячейки сотрудника.

### payroll_payouts

Фактически выданные деньги.

Поля:

- `id`;
- `work_date`;
- `employee_id`;
- `amount`;
- `created_by`;
- `created_at`.

Правило: выплаты уменьшают остаток к выплате у сотрудника, но не меняют расчетный дневной ФОТ и план выручки.

### employee_scores

Быстрые оценки сотрудника за дату.

Поля:

- `id`;
- `work_date`;
- `employee_id`;
- `score`;
- `created_by`;
- `updated_at`.

Значения `score`:

- `green`;
- `yellow`;
- `red`.

Комментариев нет намеренно. Это быстрая оценка в моменте.

## Задания

### tasks

Поручения и индивидуальные задания.

Поля:

- `id`;
- `title`;
- `employee_id`;
- `deadline_date`;
- `status`;
- `created_by`;
- `created_at`;
- `updated_at`.

На текущем этапе достаточно статусов:

- `open` - в работе;
- `done` - готово;
- `cancelled`.

Рядовой сотрудник видит только свои задачи. Сводка по команде для сотрудника обезличена: количество задач команды и количество выполненных другими без названий, имен и деталей.

## Обучение

### training_modules

Разделы базы знаний.

Поля:

- `id`;
- `slug`;
- `title`;
- `description`;
- `audience_role`;
- `sort_order`;
- `is_active`;
- `created_at`;
- `updated_at`.

Стартовый модуль: `База знаний официанта`, источник импорта — Google Doc `Библия`. Полный текст не хранится в публичном GitHub и импортируется напрямую в Postgres.

### training_chapters

Главы базы знаний.

Поля:

- `id`;
- `module_id`;
- `slug`;
- `title`;
- `summary`;
- `body`;
- `source_ref`;
- `sort_order`;
- `is_active`;
- `created_at`;
- `updated_at`.

На старте документ разбирается в 7 глав. Сотрудник с ролью `waiter` видит только материалы для официантов, руководитель и менеджер видят раздел и сводку прогресса.

### training_attachments

Привязанные материалы к главам.

Поля:

- `id`;
- `chapter_id`;
- `slug`;
- `title`;
- `kind`;
- `url`;
- `description`;
- `sort_order`;
- `is_active`.

Стартовые заглушки вложений: методичка по артефактам, карта зала и технические зоны, ТТК и паспорта блюд.

### training_routes / training_route_days / training_route_items

Маршрут стажера по дням.

Стартовая структура: 5 дней стажировки. Элементы маршрута могут ссылаться на конкретную главу базы знаний.

### training_read_marks

Отметки прочтения глав сотрудниками.

Поля:

- `employee_id`;
- `chapter_id`;
- `read_at`.

Используется для личного прогресса сотрудника и руководительской сводки.

## Заявка продуктов

### requisition_categories

Категории каталога заявки.

Поля:

- `id`;
- `name`;
- `kind` (`product` или `household`);
- `sort_order`;
- `color`;
- `active`;
- `created_at`;
- `updated_at`.

Правило видимости категорий:

- `owner` и `manager` видят все;
- `cook` видит все категории, кроме `Алкоголь` и `Напитки`;
- `bar` видит только `Алкоголь`, `Напитки`, `Фрукты`;
- прочие роли, если им вручную выдали сервис, не видят алкоголь и напитки.

### requisition_catalog_items

Позиции каталога заявки. Продуктовый каталог сидируется из `docs/etna-tovarnaya-matrica.xlsx`, лист `Товары`; категории — из листа `Категории`. Хозтовары в MVP заполнены стартовым набором-заглушкой.

Поля:

- `id`;
- `source_id`;
- `category_id`;
- `name`;
- `unit`;
- `kind`;
- `active`;
- `sort_order`;
- `created_at`;
- `updated_at`.

Единица измерения берется из каталога и снапшотится в строку заявки.

### requisitions

Шапка заявки сотрудника.

Поля:

- `id`;
- `author_id`;
- `status`;
- `comment`;
- `urgent`;
- `created_at`;
- `updated_at`.

Статусы:

- `new` - новая;
- `accepted` - принята;
- `purchased` - закуплена;
- `rejected` - отклонена.

Сотрудник видит только свои заявки. Руководитель и управляющий видят все и могут менять статус.

### requisition_lines

Строки заявки.

Поля:

- `id`;
- `requisition_id`;
- `catalog_item_id`;
- `free_name`;
- `qty`;
- `unit`;
- `kind`;
- `category_name`;
- `created_at`.

`catalog_item_id` может быть пустым только для свободной позиции `другое`.

## Закрытие смены

### shift_closings

Отчет закрытия смены. Это новая структурированная замена старой логики `RestForm` + Google Sheets/Apps Script.

Одна запись соответствует одной рабочей дате. Если смена закрывается до `06:00`, рабочая дата относится к предыдущему дню.

Поля ввода:

- `id`;
- `work_date`;
- `submitted_by`;
- `hookah_employee_id`;
- `opening_cash_actual`;
- `terminal_1`;
- `terminal_2`;
- `netmonet`;
- `yandex_food`;
- `cash_revenue`;
- `transfer_revenue`;
- `wash_cost`;
- `hookah_count`;
- `taxi_amount`;
- `collection_amount`;
- `closing_cash_actual`;
- `comment`;
- `created_at`;
- `updated_at`;
- `submitted_at`.

Расчетные поля backend:

- `opening_cash_expected`;
- `opening_cash_diff`;
- `cashless_total`;
- `revenue_total`;
- `hookah_rate`;
- `hookah_payout`;
- `extra_expenses_total`;
- `closing_cash_expected`;
- `closing_cash_diff`;
- `revenue_plan`;
- `revenue_plan_percent`;
- `cash_diff_limit`;
- `taxi_limit`.

Правила:

- `hookah_employee_id` выбирается в форме закрытия смены из активных сотрудников, у которых включена доп. роль `Кальянщик`;
- `opening_cash_expected` берется из `closing_cash_actual` предыдущей закрытой смены;
- `cashless_total = terminal_1 + terminal_2 + netmonet + yandex_food`;
- `revenue_total = cashless_total + cash_revenue + transfer_revenue`;
- `hookah_payout = hookah_count * hookah_rate`;
- `closing_cash_expected = opening_cash_actual + cash_revenue + transfer_revenue - wash_cost - hookah_payout - extra_expenses_total - collection_amount`;
- `taxi_amount` не вычитается из кассы;
- `revenue_plan` берется из модуля `График`;
- `hookah_payout` попадает в личный раздел `Выплаты` выбранного кальянщика как отдельное начисление, которое считается уже выданным из кассы закрытия смены;
- Telegram не блокирует закрытие смены.

### shift_closing_extra_expenses

Динамический список дополнительных расходов.

Поля:

- `id`;
- `shift_closing_id`;
- `amount`;
- `comment`;
- `created_at`.

### shift_closing_photos

Фото чеков и подтверждений.

Поля:

- `id`;
- `shift_closing_id`;
- `photo_type` (`terminal_1`, `terminal_2`, `shift_close`, `other`);
- `filename`;
- `mime_type`;
- `size_bytes`;
- `data`;
- `uploaded_by`;
- `created_at`.

### shift_closing_telegram_reports

История попыток отправки отчетов в Telegram.

Поля:

- `id`;
- `shift_closing_id`;
- `audience` (`manager`, `team`);
- `status` (`sent`, `failed`, `skipped`);
- `format`;
- `message_text`;
- `telegram_message_id`;
- `error`;
- `sent_at`;
- `created_at`.

## Аудит

### audit_log

История важных действий.

Поля:

- `id`;
- `actor_employee_id`;
- `action`;
- `entity_type`;
- `entity_id`;
- `before_json`;
- `after_json`;
- `created_at`;
- `ip_address`;
- `user_agent`.

Писать в аудит:

- входы;
- изменения графика;
- выплаты;
- плановые дни зарплаты;
- оценки;
- задания;
- закрытия смен;
- изменения прав доступа.

## Видимость данных

Руководитель:

- видит всех сотрудников;
- видит все смены;
- видит все начисления, выплаты, оценки, задания;
- управляет доступами к сервисам.

Сотрудник:

- видит общий график;
- видит свои часы;
- видит свой финальный доход;
- видит сколько ему уже выплачено;
- видит свои задания;
- видит свои плановые и фактические выплаты;
- не видит чужие выплаты и персональные оценки.

Админка NocoDB:

- доступна только руководителю;
- используется для управления справочниками и ручных корректировок;
- не заменяет backend-правила.
