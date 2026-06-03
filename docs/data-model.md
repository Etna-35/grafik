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

- `open`;
- `done`;
- `cancelled`.

## Закрытие смены

### shift_reports

Отчет закрытия смены.

Поля зависят от переносимого функционала `RestForm`, но базово нужны:

- `id`;
- `work_date`;
- `employee_id`;
- `revenue_total`;
- `cash_total`;
- `expenses_total`;
- `comment`;
- `submitted_at`;
- `created_at`.

На старте можно оставить совместимость с текущим `RestForm` и постепенно перенести запись из Google Sheets в Postgres.

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
