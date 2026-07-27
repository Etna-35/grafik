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

# ---------------------------------------------------------------------------
# ВЫВОЗ БЭКАПА НАРУЖУ (offsite) — S3-совместимое хранилище через rclone.
#
# Приезжает ВЫКЛЮЧЕННЫМ: пока нет файла-конфига с OFFSITE_ENABLED=1, скрипт
# просто пишет в лог «offsite выключен» и работает как раньше (локальный дамп).
# Конфиг (не в git, лежит только на сервере): /opt/etna/deploy/backup-offsite.env
#   OFFSITE_ENABLED=1
#   RCLONE_REMOTE="etna-s3:etna-backups/postgres"
#   OFFSITE_RETENTION_DAYS=30
# Ключи доступа к хранилищу — в конфиге rclone (/root/.config/rclone/rclone.conf),
# в git их нет и быть не должно. Подробности — в BACKUP-README.md.
#
# Падение вывоза НЕ считаем провалом бэкапа: локальный дамп уже сделан, поэтому
# ошибку пишем в лог заметной строкой, но выходим с кодом 0.
# ---------------------------------------------------------------------------

OFFSITE_CONF="${OFFSITE_CONF:-/opt/etna/deploy/backup-offsite.env}"
OFFSITE_ENABLED=0
RCLONE_REMOTE=""
OFFSITE_RETENTION_DAYS="$RETENTION_DAYS"
RCLONE_CONFIG_FILE="/root/.config/rclone/rclone.conf"

if [ -f "$OFFSITE_CONF" ]; then
  set -a
  # shellcheck disable=SC1090
  source "$OFFSITE_CONF"
  set +a
fi

offsite_upload() {
  if [ "${OFFSITE_ENABLED:-0}" != "1" ]; then
    log "Offsite: выключен (нет $OFFSITE_CONF или OFFSITE_ENABLED!=1) — дамп остался только на этой VM"
    return 0
  fi
  if ! command -v rclone >/dev/null 2>&1; then
    log "Offsite: ОШИБКА — rclone не установлен на сервере, вывоз пропущен"
    return 1
  fi
  if [ -z "${RCLONE_REMOTE:-}" ]; then
    log "Offsite: ОШИБКА — RCLONE_REMOTE не задан в $OFFSITE_CONF, вывоз пропущен"
    return 1
  fi

  local base
  base="$(basename "$dump_file")"

  log "Offsite: заливаю $base → $RCLONE_REMOTE"
  rclone --config "$RCLONE_CONFIG_FILE" copy "$dump_file" "$RCLONE_REMOTE" >>"$LOG_FILE" 2>&1

  # Проверяем, что файл реально виден в хранилище (иначе «залил» — это иллюзия).
  if ! rclone --config "$RCLONE_CONFIG_FILE" lsf "$RCLONE_REMOTE" 2>>"$LOG_FILE" | grep -qx "$base"; then
    log "Offsite: ОШИБКА — после заливки $base не найден в $RCLONE_REMOTE"
    return 1
  fi
  log "Offsite: OK, $base лежит в $RCLONE_REMOTE"

  # Ретенция в хранилище — та же логика, что локально (по умолчанию 30 дней).
  rclone --config "$RCLONE_CONFIG_FILE" delete "$RCLONE_REMOTE" \
    --min-age "${OFFSITE_RETENTION_DAYS}d" --include 'etna_*.dump' >>"$LOG_FILE" 2>&1 || true
  log "Offsite: ретенция применена (>${OFFSITE_RETENTION_DAYS}д)"
  return 0
}

if ! offsite_upload; then
  log "!! Offsite НЕ ВЫПОЛНЕН — локальный дамп на месте, но копии снаружи за сегодня нет"
fi

log "== Бэкап завершён успешно =="
