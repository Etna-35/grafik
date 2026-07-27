# Бэкапы PostgreSQL — SberCloud VM (боевой прод)

Скрипты в этой папке:
- `backup-postgres-sber.sh` — ежедневный дамп БД `etna_app` (`pg_dump -Fc`) в
  `/opt/etna/backups/postgres/etna_YYYY-MM-DD_HHMM.dump`, ретенция 30 дней, лог в
  `/opt/etna/backups/postgres/backup.log`.
- `restore-test.sh` — проверка, что последний дамп реально восстанавливается
  (разворачивает во временную БД `etna_restore_test`, проверяет `employees`/
  `schedule_shifts`, удаляет за собой). Боевую БД не трогает.
- `backup-postgres.sh` — СТАРЫЙ вариант под Beget (без `sudo`), для SberCloud не подходит.

Важно: скрипты писались и проверялись без подключения к серверу — перед тем как
поставить в крон, один раз прогнать вручную и посмотреть на реальный вывод (шаги ниже).

## Установка

1. Залить скрипты на сервер (из корня репозитория, с локальной машины):
   ```
   scp -i ~/.ssh/etna_sber_rsa deploy/beget/scripts/backup-postgres-sber.sh deploy/beget/scripts/restore-test.sh \
     rio35@213.171.28.138:/opt/etna/deploy/scripts/
   ```
   (папку `scripts` на сервере создать заранее, если её нет: `ssh -i ~/.ssh/etna_sber_rsa rio35@213.171.28.138 "mkdir -p /opt/etna/deploy/scripts"`)

2. Сделать исполняемыми:
   ```
   ssh -i ~/.ssh/etna_sber_rsa rio35@213.171.28.138 \
     "chmod +x /opt/etna/deploy/scripts/backup-postgres-sber.sh /opt/etna/deploy/scripts/restore-test.sh"
   ```

3. Прогнать бэкап вручную и убедиться, что дамп появился и не нулевого размера:
   ```
   ssh -i ~/.ssh/etna_sber_rsa rio35@213.171.28.138 \
     "sudo /opt/etna/deploy/scripts/backup-postgres-sber.sh && ls -lh /opt/etna/backups/postgres/"
   ```

4. Прогнать проверку восстановления (не трогает боевую БД):
   ```
   ssh -i ~/.ssh/etna_sber_rsa rio35@213.171.28.138 \
     "sudo /opt/etna/deploy/scripts/restore-test.sh"
   ```
   Ожидаемая последняя строка: `RESTORE-TEST: PASS (...)`.

5. Поставить в крон (под root, т.к. внутри `sudo docker compose`) — ежедневно в 03:15 МСК:
   ```
   ssh -i ~/.ssh/etna_sber_rsa rio35@213.171.28.138 "sudo crontab -l 2>/dev/null; echo '15 3 * * * /opt/etna/deploy/scripts/backup-postgres-sber.sh >> /opt/etna/backups/postgres/cron.log 2>&1' " | ssh -i ~/.ssh/etna_sber_rsa rio35@213.171.28.138 "sudo crontab -"
   ```
   Проще сделать вручную: `ssh ... "sudo crontab -e"` и добавить строку:
   ```
   15 3 * * * /opt/etna/deploy/scripts/backup-postgres-sber.sh >> /opt/etna/backups/postgres/cron.log 2>&1
   ```
   (опционально) добавить вторую строку — раз в неделю (например, в вс в 04:00) гонять
   `restore-test.sh`, чтобы не только делать бэкапы, но и знать, что они рабочие:
   ```
   0 4 * * 0 /opt/etna/deploy/scripts/restore-test.sh >> /opt/etna/backups/postgres/restore-test.log 2>&1
   ```

## Проверка после установки крона

- Через сутки: `ssh ... "ls -lh /opt/etna/backups/postgres/ && tail -20 /opt/etna/backups/postgres/backup.log"`
  — должен появиться свежий `etna_YYYY-MM-DD_HHMM.dump`.
- Раз в месяц (или после любых сомнений): вручную прогнать `restore-test.sh` и убедиться в `PASS`.
- Следить за местом на диске (`df -h /opt/etna`) — 30-дневная ретенция должна держать объём стабильным,
  но первый месяц стоит подглядывать.

## Восстановление БОЕВОЙ БД из дампа (пошагово, вручную — НЕ автоматизировано намеренно)

Это разрушительная операция — делать её осознанно, не скриптом, и только когда реально нужно
поднять прод из бэкапа (авария/потеря данных). Порядок:

1. Подключиться к серверу и остановить API, чтобы никто не писал в БД во время восстановления:
   ```
   ssh -i ~/.ssh/etna_sber_rsa rio35@213.171.28.138
   cd /opt/etna/deploy
   sudo docker compose stop api
   ```

2. Выбрать нужный дамп (по умолчанию — последний):
   ```
   ls -lt /opt/etna/backups/postgres/*.dump | head
   ```

3. Скопировать дамп внутрь контейнера и посмотреть его содержимое (не обязательно, но полезно перед
   разрушительным восстановлением):
   ```
   sudo docker compose exec -T postgres sh -c 'cat > /tmp/restore.dump' < /opt/etna/backups/postgres/<файл>.dump
   ```

4. ⚠️ Пересоздать боевую БД `etna_app` (это удалит все текущие данные в ней!):
   ```
   source .env
   sudo docker compose exec -T -e PGPASSWORD="$POSTGRES_PASSWORD" postgres \
     dropdb -U postgres "$ETNA_APP_DB"
   sudo docker compose exec -T -e PGPASSWORD="$POSTGRES_PASSWORD" postgres \
     createdb -U postgres -O "$ETNA_APP_USER" "$ETNA_APP_DB"
   ```

5. Восстановить дамп:
   ```
   sudo docker compose exec -T -e PGPASSWORD="$POSTGRES_PASSWORD" postgres \
     pg_restore -U postgres -d "$ETNA_APP_DB" --no-owner /tmp/restore.dump
   ```

6. Запустить API обратно и проверить здоровье:
   ```
   sudo docker compose up -d api
   curl -s -o /dev/null -w '%{http_code}\n' https://api.no-money-no-honey.ru/api/health
   ```

7. Зайти в приложение (https://lk.no-money-no-honey.ru/) и глазами проверить, что данные на месте
   (график, сотрудники, последние закрытия смен).

8. Убрать временный файл: `sudo docker compose exec -T postgres rm -f /tmp/restore.dump`.

## Вывоз бэкапов за пределы сервера (offsite) — S3 Cloud.ru через rclone

Зачем: локальные дампы лежат на той же VM, что и БД. Сгорит/пропадёт VM — пропадут и они.
Решение (владелец, 2026-07-27): объектное хранилище **Cloud.ru S3**, заливка через `rclone`,
**каждый** дамп, ретенция в хранилище **30 дней** (как локально).

Код уже в `backup-postgres-sber.sh` (блок `offsite_upload`) и приезжает **выключенным**:
пока на сервере нет `/opt/etna/deploy/backup-offsite.env` с `OFFSITE_ENABLED=1`, скрипт
пишет в лог «Offsite: выключен» и работает как раньше. Ошибка вывоза не роняет бэкап —
локальный дамп всё равно сделан, в лог падает строка `!! Offsite НЕ ВЫПОЛНЕН`.

### Что настроено заранее (сделано агентом)
- `rclone` установлен на VM (`rclone version`).
- `/opt/etna/deploy/backup-offsite.env` создан с `OFFSITE_ENABLED=0` (права 600, root) —
  шаблон с комментариями, в git его нет.

### Что делает владелец (ключи доступа агенту не передавать)
1. В панели Cloud.ru: создать бакет объектного хранилища (например `etna-backups`) и
   пару ключей S3 (Access Key / Secret Key). Регион/эндпоинт записать.
2. Прописать remote в rclone — интерактивно, ключи вводятся только на сервере:
   ```
   ssh -i ~/.ssh/etna_sber_rsa rio35@213.171.28.138
   sudo rclone config
   ```
   Ответы: `n` (new remote) → имя `etna-s3` → тип `s3` → провайдер `Other` →
   `env_auth = false` → вставить Access Key и Secret Key → region оставить пустым →
   endpoint — из панели Cloud.ru (обычно `https://s3.cloud.ru`) → остальное по умолчанию →
   `q` (выход). Конфиг ляжет в `/root/.config/rclone/rclone.conf`.
3. Проверить, что remote виден:
   ```
   sudo rclone lsd etna-s3:
   ```
4. Включить вывоз — в `/opt/etna/deploy/backup-offsite.env` поставить `OFFSITE_ENABLED=1`
   и указать свой бакет:
   ```
   sudo nano /opt/etna/deploy/backup-offsite.env
   # OFFSITE_ENABLED=1
   # RCLONE_REMOTE="etna-s3:etna-backups/postgres"
   # OFFSITE_RETENTION_DAYS=30
   ```
5. Прогнать бэкап вручную и посмотреть лог:
   ```
   sudo /opt/etna/deploy/scripts/backup-postgres-sber.sh
   tail -20 /opt/etna/backups/postgres/backup.log
   sudo rclone lsl etna-s3:etna-backups/postgres | tail
   ```
   Ожидаемая строка в логе: `Offsite: OK, etna_YYYY-MM-DD_HHMM.dump лежит в ...`.

### Проверка потом
- Раз в месяц: `sudo rclone lsl etna-s3:etna-backups/postgres | tail` — должны быть свежие файлы,
  и не больше ~30 штук (ретенция чистит старые).
- Если в `backup.log` появилась строка `!! Offsite НЕ ВЫПОЛНЕН` — смотреть строки `Offsite:` выше
  (обычно: истёк ключ, сменился эндпоинт, нет сети).
