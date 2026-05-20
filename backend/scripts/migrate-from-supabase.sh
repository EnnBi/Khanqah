#!/usr/bin/env bash
# Migrates non-auth content data from Supabase to the self-hosted PostgreSQL.
# Run once. User accounts are NOT migrated (phone numbers not stored in Supabase).
#
# Usage:
#   SUPABASE_DB_URL="postgres://..." TARGET_DB_URL="postgres://..." ./migrate-from-supabase.sh

set -euo pipefail

if [[ -z "${SUPABASE_DB_URL:-}" || -z "${TARGET_DB_URL:-}" ]]; then
  echo "Error: set SUPABASE_DB_URL and TARGET_DB_URL environment variables"
  exit 1
fi

TABLES=(categories content topics playlists playlist_items scheduled_sessions live_sessions bug_reports)
DUMP_FILE="/tmp/khanqah-supabase-dump.sql"

echo "==> Dumping data from Supabase..."
pg_dump "$SUPABASE_DB_URL" \
  --data-only \
  --no-owner \
  --no-privileges \
  --schema=public \
  $(printf -- "--table=public.%s " "${TABLES[@]}") \
  -f "$DUMP_FILE"

echo "==> Removing Supabase schema prefixes..."
sed -i 's/public\.//g' "$DUMP_FILE"

echo "==> Importing into target database..."
psql "$TARGET_DB_URL" -f "$DUMP_FILE"

echo "==> Verifying row counts..."
for table in "${TABLES[@]}"; do
  count=$(psql "$TARGET_DB_URL" -t -c "SELECT COUNT(*) FROM $table;")
  echo "  $table: $count rows"
done

echo "==> Migration complete."
echo "    User accounts were NOT migrated."
echo "    Users must re-register with their phone number."
