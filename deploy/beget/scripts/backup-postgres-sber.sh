#!/usr/bin/env bash
# Резервное копирование PostgreSQL (БД etna_app) на боевой VM SberCloud.
# Отличия от deploy/beget/scripts/backup-postgres.sh (тот написан под Beget):
#   - docker compose требует sudo на SberCloud VM;
#   - бэкапы кладём в /opt/etna/backups/postgres/etna_YYYY-MM-DD_HHMM.dump;
#   - пишем лог в отдельный файл (удобно смотреть, что делал крон ночью);
#   - ретенция 30 дней такая же, как была на Beget.
#
# Запуск вручную:
#   sudo /opt/etna/deploy/scripts/backup-postgres-sber.sh
# Запуск по крону — см. deploy/beget/scripts/BACKUP-README.md.

set -euo pipefail

# --- Настройки ---
COMPOSE_DIR="/opt/etna/deploy"
BACKUP_DIR="/opt/etna/backups/postgres"
LOG_FILE="/opt/etna/backups/postgres/backup.log"
RETENTION_DAYS=30

mkdir -p "$BACKUP_DIR"

# Все сообщения скрипта дублируем в лог-файл (с таймстампом) и на stdout.
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

log "== Старт бэкапа PostgreSQL (etna_app) =="

cd "$COMPOSE_DIR"

# Берём креды БД из .env compose-стека (там же лежат ETNA_APP_USER/DB/PASSWORD).
set -a
source .env
set +a

stamp="$(date +%Y-%m-%d_%H%M)"
dump_file="$BACKUP_DIR/etna_${stamp}.dump"

# -Fc = custom format pg_dump (компактный, восстанавливается через pg_restore,
# позволяет восстанавливать выборочно таблицы/схемы при необходимости).
sudo docker compose exec -T -e PGPASSWORD="$ETNA_APP_PASSWORD" postgres \
  pg_dump -U "$ETNA_APP_USER" -d "$ETNA_APP_DB" -Fc \
  > "$dump_file"

dump_size="$(du -h "$dump_file" | cut -f1)"
log "Дамп создан: $dump_file (${dump_size})"

# --- Ретенция: удаляем дампы старше RETENTION_DAYS дней ---
deleted_count="$(find "$BACKUP_DIR" -maxdepth 1 -type f -name 'etna_*.dump' -mtime "+${RETENTION_DAYS}" -print -delete | wc -l | tr -d ' ')"
log "Ретенция: удалено старых дампов (>${RETENTION_DAYS}д): ${deleted_count}"

log "== Бэкап завершён успешно =="

# ---------------------------------------------------------------------------
# ВЫВОЗ БЭКАПА НАРУЖУ (offsite) — пока НЕ включено, ждём решения владельца
# по хранилищу. Оставлено закомментированным, включить один из вариантов
# после того как появится: (а) второй сервер с SSH-доступом, или
# (б) аккаунт в объектном хранилище (S3-совместимое / rclone-remote).
# ---------------------------------------------------------------------------

# --- Вариант А: scp на другой хост (например, Beget-VPS как offsite-копия) ---
# TODO: заполнить перед включением.
# OFFSITE_HOST="etna-vps"                       # ssh-алиас или user@host
# OFFSITE_DIR="/opt/etna/backups-offsite"       # папка на удалённом хосте
# ssh "$OFFSITE_HOST" "mkdir -p $OFFSITE_DIR"
# scp "$dump_file" "$OFFSITE_HOST:$OFFSITE_DIR/"
# log "Вывезено на $OFFSITE_HOST:$OFFSITE_DIR"

# --- Вариант Б: объектное хранилище (S3-совместимое) через s3cmd ---
# TODO: заполнить перед включением (bucket, ключи в /root/.s3cfg или env).
# S3_BUCKET="s3://TODO-bucket-name/postgres-backups"
# s3cmd put "$dump_file" "$S3_BUCKET/"
# log "Вывезено в $S3_BUCKET"

# --- Вариант В: объектное хранилище через rclone (альтернатива s3cmd) ---
# TODO: заполнить remote (rclone config) перед включением.
# RCLONE_REMOTE="TODO-remote-name:etna-backups/postgres"
# rclone copy "$dump_file" "$RCLONE_REMOTE"
# log "Вывезено через rclone в $RCLONE_REMOTE"
