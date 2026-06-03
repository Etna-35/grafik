# График смен Etna

Проект: «График смен Etna».

Основной файл приложения: `grafik/index.html` в рабочей папке проекта.

Приложение полностью клиентское: хранит данные в `localStorage`, резервное копирование выполняется через выгрузку и загрузку JSON внутри интерфейса.

Деплой: GitHub Pages.

Правки логики приложения предварительно согласовывать с пользователем.

## Личный кабинет / сервис

Выбранная целевая связка для полноценного ЛК: Postgres + небольшой backend + NocoDB как внутренняя админка руководителя.

Backend должен быть слоем авторизации, прав доступа и бизнес-логики. NocoDB не использовать как публичный интерфейс для сотрудников.

Целевые документы подготовки:

- `docs/service-architecture.md`
- `docs/data-model.md`
- `docs/implementation-roadmap.md`

Текущий GitHub Pages график оставить рабочим до переноса календаря в backend и Postgres.

Для MVP выбран VPS в РФ от Beget. План деплоя: `docs/deployment-beget.md`.

Купленная конфигурация: 2 CPU 3-3.3 GHz, 4 GB RAM, 40 GB NVMe, канал 1 Gbit/s, Ubuntu 24.04, IP `212.67.14.25`. Backup VPS провайдера не заменяет ежедневный `pg_dump` Postgres.

2026-06-03 VPS первично настроен: Docker/Compose, Postgres, Redis, NocoDB, Caddy HTTPS, firewall только `22/80/443`, swap 2 GB, ежедневный backup Postgres в 03:15. Поддомены `lk`, `api`, `admin` смотрят на VPS и отдают 200.

2026-06-03 развернут MVP ЛК: `apps/api` на Fastify/TypeScript, SQL migrations, argon2id PIN, httpOnly cookie sessions, frontend `apps/web`. Первый owner `Руководитель` заходит по PIN, получает сервисы `schedule`, `shift_close`, `tasks`, `payroll`, `admin`. PIN и NocoDB пароль хранятся на сервере в `/opt/etna/secrets/initial-credentials.txt`, не в git.

2026-06-03 начат перенос календаря: добавлен `apps/api/src/schedule.ts`, миграция `002_schedule_import_fields.sql`, API `/api/schedule` и `/api/schedule/import`, экран `/grafik` в ЛК читает Postgres и импортирует JSON-бэкап старого календаря. Тестовый импорт проверен и очищен. Следующее: полноценное редактирование графика через API.
