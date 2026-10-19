#!/usr/bin/env bash
# Valida as migrações do Mylink num PostgreSQL padrão (Docker descartável).
# Uso: bash tests/db/run.sh
set -euo pipefail
cd "$(dirname "$0")/../.."

docker rm -f mylink-db-validate >/dev/null 2>&1 || true
docker run -d --name mylink-db-validate -e POSTGRES_PASSWORD=test -e POSTGRES_DB=mylink postgres:16 >/dev/null
trap 'docker rm -f mylink-db-validate >/dev/null 2>&1 || true' EXIT

for _ in $(seq 1 90); do
  docker exec mylink-db-validate pg_isready -U postgres >/dev/null 2>&1 && break
  sleep 1
done

cat tests/db/00-supabase-compat.sql \
     supabase/migrations/0001_init.sql \
     supabase/migrations/0002_seed.sql \
     tests/db/10-grants.sql \
     tests/db/20-smoke.sql \
  | docker exec -i mylink-db-validate psql -U postgres -d mylink -v ON_ERROR_STOP=1 -q

echo "SQL: OK — migrações e regras de negócio validadas"
