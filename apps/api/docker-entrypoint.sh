#!/usr/bin/env bash
set -euo pipefail

node apps/api/dist/migrate.js

if [ -n "${OWNER_PIN:-}" ]; then
  node apps/api/dist/seed.js
fi

exec node apps/api/dist/server.js

