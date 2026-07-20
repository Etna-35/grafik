#!/usr/bin/env bash
# Проверка восстановления бэкапа PostgreSQL (etna_app) на SberCloud VM.
# Ничего не делает с боевой БД — разворачивает ПОСЛЕДНИЙ дамп во временную
# базу etna_restore_test в ТОМ ЖЕ контейнере postgres, проверяет пару таблиц
# на здравый смысл и удаляет временную базу за собой.
#
# Запуск вручную:
#   sudo /opt/etna/deploy/scripts/restore-test.sh
# Ожидаемый результат в конце: "RESTORE-TEST: PASS" (код возврата 0)
# либо "RESTORE-TEST: FAIL" (код возврата 1) — тогда смотреть вывод выше.

set -euo pipefail

COMPOSE_DIR="/opt/etna/deploy"
BACKUP_DIR="/opt/etna/backups/postgres"
TEST_DB="etna_restore_test"

fail() {
  echo "RESTORE-TEST: FAIL — $*"
  exit 1
}

cd "$COMPOSE_DIR"
set -a
source .env
set +a

# --- Находим последний по времени дамп ---
latest_dump="$(ls -1t "$BACKUP_DIR"/etna_*.dump 2>/dev/null | head -n1 || true)"
if [ -z "$latest_dump" ]; then
  fail "в $BACKUP_DIR нет ни одного файла etna_*.dump"
fi
echo "Проверяем дамп: $latest_dump"

# Имя дампа внутри контейнера (монтируем через docker compose cp, проще —
# копируем во временный файл внутри контейнера через stdin).
container_tmp="/tmp/restore-test.dump"

# --- На всякий случай подчищаем тестовую БД, если осталась от прошлого прогона ---
sudo docker compose exec -T -e PGPASSWORD="$POSTGRES_PASSWORD" postgres \
  psql -U postgres -d postgres -tAc \
  "SELECT 1 FROM pg_database WHERE datname = '${TEST_DB}'" | grep -q 1 && {
    echo "Тестовая БД уже существует (осталась от прошлого прогона) — удаляем."
    sudo docker compose exec -T -e PGPASSWORD="$POSTGRES_PASSWORD" postgres \
      dropdb -U postgres "$TEST_DB"
  } || true

# --- Создаём временную БД ---
sudo docker compose exec -T -e PGPASSWORD="$POSTGRES_PASSWORD" postgres \
  createdb -U postgres "$TEST_DB" \
  || fail "createdb не выполнился"

cleanup() {
  sudo docker compose exec -T -e PGPASSWORD="$POSTGRES_PASSWORD" postgres \
    dropdb -U postgres "$TEST_DB" 2>/dev/null || true
  sudo docker compose exec -T postgres rm -f "$container_tmp" 2>/dev/null || true
}
trap cleanup EXIT

# --- Заливаем дамп внутрь контейнера и восстанавливаем через pg_restore ---
sudo docker compose exec -T postgres sh -c "cat > $container_tmp" < "$latest_dump"

sudo docker compose exec -T -e PGPASSWORD="$POSTGRES_PASSWORD" postgres \
  pg_restore -U postgres -d "$TEST_DB" --no-owner "$container_tmp" \
  || fail "pg_restore завершился с ошибкой"

# --- Sanity-проверки: таблицы существуют и не пустые ---
employees_count="$(sudo docker compose exec -T -e PGPASSWORD="$POSTGRES_PASSWORD" postgres \
  psql -U postgres -d "$TEST_DB" -tAc "SELECT count(*) FROM employees" | tr -d '[:space:]')"
shifts_count="$(sudo docker compose exec -T -e PGPASSWORD="$POSTGRES_PASSWORD" postgres \
  psql -U postgres -d "$TEST_DB" -tAc "SELECT count(*) FROM schedule_shifts" | tr -d '[:space:]')"

echo "employees: $employees_count"
echo "schedule_shifts: $shifts_count"

if [ -z "$employees_count" ] || [ "$employees_count" -le 0 ]; then
  fail "employees пуст или не читается ($employees_count)"
fi
if [ -z "$shifts_count" ] || [ "$shifts_count" -le 0 ]; then
  fail "schedule_shifts пуст или не читается ($shifts_count)"
fi

# cleanup() выполнится автоматически по trap EXIT (dropdb + удаление временного файла)
echo "RESTORE-TEST: PASS (дамп: $latest_dump, employees=$employees_count, schedule_shifts=$shifts_count)"
