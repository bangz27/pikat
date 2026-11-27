#!/usr/bin/env bash
# Applies supabase/migrations to a throwaway local PostgreSQL+PostGIS cluster and runs assertions.
# Needs PostgreSQL 15+/16 server binaries and PostGIS installed locally. Does NOT touch any remote DB.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
TMP="$(mktemp -d)"
PORT="${PGPORT_TEST:-54329}"
RUN_AS=()
if [ "$(id -u)" = "0" ]; then chown -R postgres "$TMP"; RUN_AS=(sudo -u postgres); fi
cleanup() { "${RUN_AS[@]}" "$PGBIN/pg_ctl" -D "$TMP/data" stop -m immediate >/dev/null 2>&1 || true; rm -rf "$TMP"; }
trap cleanup EXIT
"${RUN_AS[@]}" "$PGBIN/initdb" -D "$TMP/data" -U postgres -A trust >/dev/null
"${RUN_AS[@]}" "$PGBIN/pg_ctl" -D "$TMP/data" -o "-p $PORT -k $TMP -c listen_addresses=''" -l "$TMP/log" start >/dev/null
PSQL=("${RUN_AS[@]}" psql -h "$TMP" -p "$PORT" -U postgres -v ON_ERROR_STOP=1 -q)
# Emulate what Supabase provides out of the box.
"${PSQL[@]}" -c "create schema extensions; create role anon nologin; create role authenticated nologin; grant usage on schema public, extensions to anon, authenticated;"
for f in "$ROOT"/supabase/migrations/*.sql; do
  echo "applying $(basename "$f")"
  "${PSQL[@]}" -f "$f"
done
"${PSQL[@]}" -f "$ROOT/supabase/tests/migration_test.sql"
