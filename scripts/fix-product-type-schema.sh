#!/usr/bin/env bash
# Apply product_types / products.productTypeId schema fix so /api/products returns 200.
# Use when backend is unhealthy with "column products.productTypeId does not exist".
# Idempotent: safe to run multiple times.

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SQL_FILE="${SCRIPT_DIR}/fix-product-type-schema.sql"

if [ ! -f "$SQL_FILE" ]; then
  echo "Error: $SQL_FILE not found"
  exit 1
fi

# Prefer docker compose (postgres service name)
if docker compose exec -T postgres psql -U postgres -d ecommerce -f - < "$SQL_FILE" 2>/dev/null; then
  echo "Product type schema fix applied via docker compose."
  exit 0
fi

# Try older docker-compose
if docker-compose exec -T postgres psql -U postgres -d ecommerce -f - < "$SQL_FILE" 2>/dev/null; then
  echo "Product type schema fix applied via docker-compose."
  exit 0
fi

# Direct psql when DATABASE_URL is set
if [ -n "$DATABASE_URL" ]; then
  psql "$DATABASE_URL" -f "$SQL_FILE" && echo "Product type schema fix applied via DATABASE_URL." && exit 0
fi

echo "Could not run SQL. Start Postgres (e.g. docker compose up -d postgres) or set DATABASE_URL and run:"
echo "  psql \$DATABASE_URL -f $SQL_FILE"
exit 1
