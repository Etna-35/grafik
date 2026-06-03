#!/usr/bin/env bash
set -euo pipefail

cd /opt/etna/deploy
set -a
source .env
set +a

backup_dir="/opt/etna/backups/postgres"
mkdir -p "$backup_dir"
stamp="$(date +%Y-%m-%d_%H-%M-%S)"

docker compose exec -T -e PGPASSWORD="$ETNA_APP_PASSWORD" postgres \
  pg_dump -U "$ETNA_APP_USER" -d "$ETNA_APP_DB" -Fc \
  > "$backup_dir/${stamp}_${ETNA_APP_DB}.dump"

docker compose exec -T -e PGPASSWORD="$NOCODB_META_PASSWORD" postgres \
  pg_dump -U "$NOCODB_META_USER" -d "$NOCODB_META_DB" -Fc \
  > "$backup_dir/${stamp}_${NOCODB_META_DB}.dump"

find "$backup_dir" -type f -name "*.dump" -mtime +30 -delete

