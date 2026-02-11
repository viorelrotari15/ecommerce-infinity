#!/usr/bin/env bash
# Periodic PostgreSQL dump for ecommerce-infinity.
# Run from project root. Uses .env for DB_USER/DB_NAME if present.
# Usage: ./scripts/backup-db.sh   or   make backup

set -e

CONTAINER_NAME="${BACKUP_POSTGRES_CONTAINER:-ecommerce-postgres}"
BACKUP_DIR="${BACKUP_DIR:-./backups/postgres}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"

# Load DB_USER and DB_NAME from .env if present (project root = cwd)
if [ -f .env ]; then
  export $(grep -E '^DB_USER=' .env | head -1 | xargs)
  export $(grep -E '^DB_NAME=' .env | head -1 | xargs)
fi

DB_USER="${DB_USER:-postgres}"
DB_NAME="${DB_NAME:-ecommerce}"

mkdir -p "$BACKUP_DIR"
FILE="$BACKUP_DIR/${DB_NAME}_$(date +%Y%m%d_%H%M%S).dump"

if ! docker exec "$CONTAINER_NAME" pg_dump -U "$DB_USER" -Fc "$DB_NAME" > "$FILE"; then
  echo "Backup failed: pg_dump error" >&2
  rm -f "$FILE"
  exit 1
fi

echo "Backup saved: $FILE"

# Remove dumps older than RETENTION_DAYS
if [ -n "$RETENTION_DAYS" ] && [ "$RETENTION_DAYS" -gt 0 ]; then
  find "$BACKUP_DIR" -name "*.dump" -type f -mtime +"$RETENTION_DAYS" -delete
fi

exit 0
