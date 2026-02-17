#!/usr/bin/env bash
# Apply orders table schema fix (guestEmail, regionId, etc.) to the database.
# Use when production still returns 500 on /api/orders and migrate deploy already ran or is not an option.
# Idempotent: safe to run multiple times.

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SQL_FILE="${SCRIPT_DIR}/fix-orders-schema.sql"

if [ ! -f "$SQL_FILE" ]; then
  echo "Error: $SQL_FILE not found"
  exit 1
fi

# Prefer docker compose (postgres service name)
if docker compose exec -T postgres psql -U postgres -d ecommerce -f - < "$SQL_FILE" 2>/dev/null; then
  echo "Orders schema fix applied via docker compose."
  exit 0
fi

# Try older docker-compose
if docker-compose exec -T postgres psql -U postgres -d ecommerce -f - < "$SQL_FILE" 2>/dev/null; then
  echo "Orders schema fix applied via docker-compose."
  exit 0
fi

# Direct psql when DATABASE_URL is set
if [ -n "$DATABASE_URL" ]; then
  psql "$DATABASE_URL" -f "$SQL_FILE" && echo "Orders schema fix applied via DATABASE_URL." && exit 0
fi

echo "Could not run SQL. Start Postgres (e.g. docker compose up -d postgres) or set DATABASE_URL and run:"
echo "  psql \$DATABASE_URL -f $SQL_FILE"
exit 1
