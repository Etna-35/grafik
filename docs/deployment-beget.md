# Деплой ЛК Etna на Beget VPS

## Выбранный вариант

Для MVP используем VPS в РФ от Beget.

Цель: запустить на одном сервере:

- `Postgres`;
- backend API;
- frontend личного кабинета;
- `NocoDB` как админку руководителя;
- reverse proxy с HTTPS;
- регулярные backup базы.

Beget VPS подходит для старта, потому что VPS в РФ дает root-доступ, быстрый запуск и размещение сервера в России. Это важно для работы без VPN и для пользователей из РФ.

## Минимальные требования к VPS

Купленная конфигурация MVP:

- 2 CPU 3-3.3 GHz;
- 4 GB RAM;
- 40 GB NVMe;
- канал 1 Gbit/s;
- Ubuntu 24.04 LTS;
- публичный IPv4 `212.67.14.25`;
- root-доступ по SSH;
- доступ к портам `80` и `443`;
- возможность ставить Docker.

Желательный минимум для более спокойной работы:

- 2 CPU;
- 4 GB RAM;
- 60 GB NVMe;
- Ubuntu 24.04 LTS или Ubuntu 22.04 LTS;
- root-доступ по SSH;
- публичный IPv4;
- доступ к портам `80` и `443`;
- возможность ставить Docker.

Лучше для спокойной работы:

- 4 CPU;
- 8 GB RAM;
- 80 GB NVMe или больше.

Купленный тариф подходит для MVP. Диск 40 GB меньше желательных 60 GB, поэтому важно сразу настроить ежедневный `pg_dump`, ротацию backup-файлов и не хранить большие файлы на сервере.

## Текущее состояние сервера

Дата первичной настройки: 2026-06-03.

Уже настроено:

- SSH-доступ по ключу для Codex с локальным алиасом `etna-vps`;
- hostname `etna-vps`;
- timezone `Europe/Moscow`;
- swap-файл 2 GB;
- firewall `ufw`: наружу открыты только `22`, `80`, `443`;
- `fail2ban`;
- unattended security updates;
- Docker `29.1.3`;
- Docker Compose `2.40.3`;
- директории `/opt/etna/deploy`, `/opt/etna/backups`, `/opt/etna/logs`, `/opt/etna/secrets`;
- закрытый серверный файл `/opt/etna/deploy/.env`;
- закрытый файл первичных доступов `/opt/etna/secrets/initial-credentials.txt`;
- ежедневный backup Postgres в 03:15 по Москве через `/etc/cron.d/etna-postgres-backup`.

Проверено:

- `https://lk.no-money-no-honey.ru/` отдаёт `200`;
- `https://api.no-money-no-honey.ru/api/health` отдаёт `200`;
- `https://admin.no-money-no-honey.ru/` отдаёт `200`;
- вход по PIN в `https://lk.no-money-no-honey.ru/` работает;
- owner-пользователь `Руководитель` создан и имеет доступ к сервисам `schedule`, `shift_close`, `tasks`, `payroll`, `admin`;
- `https://lk.no-money-no-honey.ru/grafik` показывает раздел графика из Postgres;
- импорт JSON-бэкапа календаря через API проверен на тестовом бэкапе;
- публичные порты `5432` и `8080` закрыты;
- публичные порты `80` и `443` открыты;
- пробный backup Postgres создан.

## Что нужно получить из панели Beget

Перед настройкой нужны:

- IP-адрес VPS;
- логин SSH, обычно `root`;
- способ входа: пароль или SSH key;
- установленная ОС;
- размер диска;
- объем RAM;
- включены ли snapshot/backup VPS;
- есть ли firewall в панели провайдера.

Пароли и приватные ключи в репозиторий не добавлять.

## DNS

Для домена `no-money-no-honey.ru` нужно создать `A`-записи на IP VPS.

MVP-вариант:

```text
lk.no-money-no-honey.ru      A  <VPS_IP>
api.no-money-no-honey.ru     A  <VPS_IP>
admin.no-money-no-honey.ru   A  <VPS_IP>
```

Позже:

```text
grafik.no-money-no-honey.ru  A  <VPS_IP>
smena.no-money-no-honey.ru   A  <VPS_IP>
```

На первом этапе можно обойтись одним доменом `lk.no-money-no-honey.ru`, но поддомены лучше создать сразу.

## Порты

Открыть наружу:

- `22` - SSH, желательно ограничить по IP, если возможно;
- `80` - HTTP для выпуска сертификатов;
- `443` - HTTPS.

Не открывать наружу:

- `5432` - Postgres;
- `8080` - NocoDB;
- внутренний порт backend.

Postgres, NocoDB и backend должны быть доступны только внутри Docker-сети. Наружу смотрит только reverse proxy.

## Схема Docker Compose

Контейнеры:

- `postgres`;
- `redis`;
- `api`;
- `nocodb`;
- `caddy`.

Контейнер `api` обслуживает backend API и статический frontend личного кабинета.

Сети:

- `internal` - Postgres, API, NocoDB;
- `public` - Caddy и публичные входы.

Volumes:

- `postgres_data`;
- `nocodb_data`;
- `caddy_data`;
- `caddy_config`;

Backup-файлы лежат не в Docker volume, а в серверной директории `/opt/etna/backups/postgres`.

## Postgres

Postgres - основная база.

На старте можно использовать один Postgres-контейнер и несколько баз:

- `etna_app` - данные ЛК;
- `nocodb_meta` - служебные данные NocoDB.

Важно: NocoDB может подключаться к `etna_app` как к внешнему источнику данных для админки, но его собственные метаданные лучше хранить отдельно.

## NocoDB

NocoDB ставим self-hosted.

Обязательные переменные:

- `NC_DB` - подключение к Postgres для служебных данных NocoDB;
- `NC_AUTH_JWT_SECRET`;
- `NC_ADMIN_EMAIL`;
- `NC_ADMIN_PASSWORD`;
- `NC_SITE_URL=https://admin.no-money-no-honey.ru`.

NocoDB не отдавать сотрудникам. Только руководителю.

## Backend

Backend отвечает за:

- вход по PIN;
- сессии;
- права доступа;
- API календаря;
- API закрытия смены;
- выплаты;
- оценки;
- задания;
- аудит.

Технически:

- Node.js;
- TypeScript;
- Fastify;
- Drizzle ORM или SQL migrations;
- Zod;
- argon2id.

## HTTPS

Рекомендуемый reverse proxy: `Caddy`.

Причины:

- автоматически выпускает HTTPS-сертификаты;
- простая конфигурация;
- удобно проксировать поддомены.

Пример маршрутизации:

```text
lk.no-money-no-honey.ru      -> frontend/api app
api.no-money-no-honey.ru     -> backend
admin.no-money-no-honey.ru   -> nocodb
```

## Backup

Backup VPS от провайдера полезен, но его недостаточно.

Нужно отдельно:

- ежедневный `pg_dump`;
- хранение минимум 14-30 дней;
- backup-файлы вне контейнера;
- желательно копия в S3-хранилище РФ;
- проверка восстановления хотя бы раз после настройки.

Минимально:

```text
/opt/etna/backups/postgres/YYYY-MM-DD_etna_app.dump
```

Позже:

- автоматическая отправка backup в S3;
- уведомление в Telegram при ошибке backup.

## Каталоги на сервере

Рекомендуемая структура:

```text
/opt/etna/
  app/
  deploy/
  backups/
  logs/
  secrets/
```

Файл `.env` хранить на сервере, не в Git.

## Переменные окружения

Минимально нужны:

```text
POSTGRES_PASSWORD=
ETNA_APP_DB=etna_app
ETNA_APP_USER=etna_app
ETNA_APP_PASSWORD=
NOCODB_META_DB=nocodb_meta
NOCODB_META_USER=nocodb
NOCODB_META_PASSWORD=
NC_AUTH_JWT_SECRET=
NC_CONNECTION_ENCRYPT_KEY=
NC_ADMIN_EMAIL=admin@no-money-no-honey.ru
NC_ADMIN_PASSWORD=
NC_SITE_URL=https://admin.no-money-no-honey.ru
```

Когда появится backend, будут добавлены отдельные переменные для сессий, PIN-хеширования и публичных URL API/frontend.
Backend уже использует `SESSION_SECRET`, `PIN_PEPPER`, `OWNER_NAME`, `OWNER_PIN`, `COOKIE_SECURE`, `PUBLIC_GRAFIK_URL`.
Для Telegram-отчетов закрытия смены можно добавить `TELEGRAM_BOT_TOKEN`, `TELEGRAM_MANAGER_CHAT_ID`, `TELEGRAM_TEAM_CHAT_ID`. Если эти переменные не заданы или Telegram недоступен, закрытие смены не блокируется, а попытка отправки сохраняется как `skipped` или `failed`.

## Первичная установка сервера

Порядок:

1. Обновить систему. Выполнено.
2. Настроить SSH key. Выполнено.
3. Включить firewall. Выполнено.
4. Установить Docker и Docker Compose. Выполнено.
5. Создать каталоги `/opt/etna`. Выполнено.
6. Разложить `.env`. Выполнено.
7. Запустить `docker compose up -d`. Выполнено.
8. Проверить HTTPS. Выполнено.
9. Проверить `/health`. Выполнено.
10. Проверить вход в NocoDB. Сервис отвечает, вход доступен по первичным данным на сервере.
11. Настроить backup. Выполнено.
12. Создать пользователя для деплоя. Отложено до отдельного deploy pipeline.
13. Закрыть вход по паролю. Отложено до отдельного подтверждения, чтобы не потерять аварийный доступ.

## Что нужно решить перед программированием

1. Точный тариф VPS: CPU, RAM, диск. Сейчас: 2 CPU, 4 GB RAM, 40 GB NVMe.
2. Какая ОС стоит на сервере. Сейчас: Ubuntu 24.04.
3. Где управляется DNS домена `no-money-no-honey.ru`.
4. Будем ли сразу использовать поддомены или сначала один домен.
5. Нужен ли доступ Codex к серверу по SSH для настройки. Да, доступ настроен.

## Рекомендация

Для MVP на существующем VPS:

- оставить Postgres внутри Docker;
- не подключать managed database на первом этапе;
- поднять NocoDB рядом;
- сделать обязательный `pg_dump` backup;
- после первых рабочих данных оценить нагрузку и решить, нужно ли выносить Postgres отдельно.
