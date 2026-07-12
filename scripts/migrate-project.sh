#!/usr/bin/env bash
#
# Move this app's Supabase project to a new one (new account / new org).
#
# Dumps the TRUE schema + data from the old project's Postgres and restores it
# into the new one. We dump rather than replay supabase/migrations/*.sql on
# purpose: those files have drifted from the live database (e.g. 014 declares
# patients.id as uuid; it is actually text, holding 'HOSP-PAT-59588'). Replaying
# them would rebuild a database that does not match the code.
#
# Reads both connection strings from .env.local:
#   SUPABASE_DB_URL      -- the OLD project (source)
#   SUPABASE_DB_URL_NEW  -- the NEW project (target)
#
# Note: the old project's REST API is 402-blocked (quota restriction), but
# Postgres itself is NOT -- the pooler still authenticates. That is why this
# dump works at all. Host is aws-1-ap-southeast-2 (not aws-0; the tenant does
# not exist there).
#
# Usage:
#   ./scripts/migrate-project.sh dump      # step 1: pull from old
#   ./scripts/migrate-project.sh restore   # step 2: push into new
#   ./scripts/migrate-project.sh verify    # step 3: compare row counts
#
set -euo pipefail

cd "$(dirname "$0")/.."
OUT_DIR="supabase/dump"
SCHEMA_FILE="$OUT_DIR/schema.sql"
DATA_FILE="$OUT_DIR/data.sql"

envval() {
  grep -E "^$1=" .env.local 2>/dev/null | head -1 | cut -d= -f2- | sed 's/^["'"'"']//;s/["'"'"']$//'
}

SRC="$(envval SUPABASE_DB_URL)"
DST="$(envval SUPABASE_DB_URL_NEW)"

case "${1:-}" in
  dump)
    [ -n "$SRC" ] || { echo "SUPABASE_DB_URL is not set in .env.local"; exit 1; }
    mkdir -p "$OUT_DIR"

    echo "==> Dumping SCHEMA from the old project…"
    # Only the app's own schema. Supabase manages auth/storage/realtime itself
    # and recreates them on a new project -- dumping them would collide.
    pg_dump "$SRC" \
      --schema-only \
      --schema=public \
      --no-owner --no-privileges \
      --no-comments \
      -f "$SCHEMA_FILE"

    echo "==> Dumping DATA from the old project…"
    # auth.users must come across too, or every profile row is an orphan FK and
    # nobody can sign in. It is the one non-public table we genuinely need.
    pg_dump "$SRC" \
      --data-only \
      --schema=public \
      --table='auth.users' \
      --no-owner --no-privileges \
      --disable-triggers \
      -f "$DATA_FILE" 2>/dev/null \
    || pg_dump "$SRC" \
      --data-only --schema=public \
      --no-owner --no-privileges --disable-triggers \
      -f "$DATA_FILE"

    echo
    echo "Wrote:"
    wc -l "$SCHEMA_FILE" "$DATA_FILE"
    echo
    echo "Next: create the new project, put its URI in .env.local as"
    echo "SUPABASE_DB_URL_NEW=…, then run: ./scripts/migrate-project.sh restore"
    ;;

  restore)
    [ -n "$DST" ] || { echo "SUPABASE_DB_URL_NEW is not set in .env.local"; exit 1; }
    [ -f "$SCHEMA_FILE" ] || { echo "No dump found. Run 'dump' first."; exit 1; }

    echo "==> Restoring SCHEMA into the new project…"
    psql "$DST" -v ON_ERROR_STOP=1 -f "$SCHEMA_FILE"

    echo "==> Restoring DATA into the new project…"
    # Not ON_ERROR_STOP: auth.users rows may already exist if you re-ran this,
    # and a duplicate-key there should not abandon the rest of the restore.
    psql "$DST" -f "$DATA_FILE"

    echo
    echo "Done. Now swap the three API values in .env.local to the new project:"
    echo "  NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY"
    ;;

  verify)
    [ -n "$DST" ] || { echo "SUPABASE_DB_URL_NEW is not set in .env.local"; exit 1; }
    echo "==> Row counts in the NEW project:"
    psql "$DST" -At -c "
      select table_name || ': ' ||
             (xpath('/row/c/text()',
               query_to_xml(format('select count(*) as c from public.%I', table_name),
               false, true, '')))[1]::text
      from information_schema.tables
      where table_schema = 'public' and table_type = 'BASE TABLE'
      order by table_name;
    "
    ;;

  *)
    echo "usage: $0 {dump|restore|verify}"
    exit 1
    ;;
esac
