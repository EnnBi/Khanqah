#!/usr/bin/env bash
# Applies any backend/migrations/*.up.sql that hasn't been applied yet.
# Runs ON the server (called by .github/workflows/deploy-backend.yml); uses the
# server's local postgres login, so no credentials are needed.
#
# Usage: apply-migrations.sh <migrations-dir>
#
# Each migration runs in one transaction together with its bookkeeping row, so a
# failure leaves the database untouched. Migrations must be backward compatible
# with the previous release (the old binary keeps serving until the new one starts).
set -euo pipefail

DIR=${1:?usage: apply-migrations.sh <migrations-dir>}
DB=${MIGRATE_DB:-khanqah}
# Migrations up to this number predate this runner and were applied by hand.
BASELINE=7

psql_() { sudo -u postgres psql -d "$DB" -v ON_ERROR_STOP=1 -qAt "$@"; }

psql_ -c "CREATE TABLE IF NOT EXISTS applied_migrations (
  name TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)"

# First run: record the hand-applied migrations instead of re-running them.
if [ "$(psql_ -c 'SELECT COUNT(*) FROM applied_migrations')" = "0" ]; then
  for f in "$DIR"/*.up.sql; do
    name=$(basename "$f")
    if [ $((10#${name%%_*})) -le "$BASELINE" ]; then
      psql_ -c "INSERT INTO applied_migrations (name) VALUES ('$name') ON CONFLICT DO NOTHING"
      echo "baseline: $name"
    fi
  done
fi

for f in $(ls "$DIR"/*.up.sql | sort); do
  name=$(basename "$f")
  if [ -n "$(psql_ -c "SELECT 1 FROM applied_migrations WHERE name = '$name'")" ]; then
    continue
  fi
  echo "applying: $name"
  { cat "$f"; printf "\nINSERT INTO applied_migrations (name) VALUES ('%s');\n" "$name"; } | psql_ -1 -f -
done

echo "migrations up to date"
