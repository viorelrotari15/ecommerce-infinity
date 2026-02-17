# Periodic database backups

This project supports periodic PostgreSQL dumps for safety. Backups are stored locally and can be scheduled with cron (Linux) or Task Scheduler (Windows).

## Quick run

From the project root, with Docker and the Postgres container running:

```bash
make backup
```

Or directly:

```bash
bash scripts/backup-db.sh
```

Backups are written to `./backups/postgres/` by default, with filenames like `ecommerce_20250206_140530.dump`.

## Configuration

Environment variables (optional; can be set in `.env` or before running):

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_USER` | `postgres` | PostgreSQL user (must match your DB) |
| `DB_NAME` | `ecommerce` | Database name |
| `BACKUP_DIR` | `./backups/postgres` | Directory for dump files |
| `BACKUP_RETENTION_DAYS` | `14` | Delete dumps older than this many days |
| `BACKUP_POSTGRES_CONTAINER` | `ecommerce-postgres` | Docker container name for Postgres |

Example: keep 30 days of backups in a custom folder:

```bash
export BACKUP_DIR=/var/backups/ecommerce
export BACKUP_RETENTION_DAYS=30
./scripts/backup-db.sh
```

## Scheduling (periodic dumps)

### Linux / server (cron)

1. Choose a backup directory, e.g. `/var/backups/ecommerce` (create it and set permissions).
2. Add a cron job. Edit crontab: `crontab -e`, then add:

```cron
# Daily at 2:00 AM – run from project directory and use env file
0 2 * * * cd /path/to/ecommerce-infinity && BACKUP_DIR=/var/backups/ecommerce ./scripts/backup-db.sh
```

Or use a wrapper script that loads `.env` and runs the backup (recommended if your `.env` is not in a shared location):

```bash
#!/bin/bash
# /opt/ecommerce-infinity/cron-backup.sh
cd /path/to/ecommerce-infinity
set -a
[ -f .env ] && . ./.env
set +a
export BACKUP_DIR=/var/backups/ecommerce
./scripts/backup-db.sh
```

Then in crontab:

```cron
0 2 * * * /opt/ecommerce-infinity/cron-backup.sh
```

### Windows (Task Scheduler)

1. Open Task Scheduler.
2. Create Basic Task → Trigger: Daily at 2:00 AM.
3. Action: Start a program.
   - Program: `bash` (or full path to Git Bash / WSL bash).
   - Arguments: `scripts/backup-db.sh`.
   - Start in: `D:\path\to\ecommerce-infinity`.

Alternatively, run `make backup` from a scheduled task that starts in the project directory.

## Restore from a dump

1. Ensure the Postgres container is running.
2. Restore (this replaces current DB content):

```bash
docker exec -i ecommerce-postgres pg_restore -U postgres -d ecommerce --clean --if-exists < ./backups/postgres/ecommerce_YYYYMMDD_HHMMSS.dump
```

Use your actual `DB_USER`, `DB_NAME`, and dump filename. If the database or roles don’t exist, create them first or use `pg_restore` options as needed.

## Off-server copies

For extra safety, copy dumps to another machine or object storage (e.g. S3, NAS) after each run. Example after backup:

```bash
rsync -a /var/backups/ecommerce/ backup-server:/backups/ecommerce/
```

Or add a second step in your cron script to upload to S3/MinIO.

## What is backed up

- **PostgreSQL**: Full database dump (schema + data) via `pg_dump -Fc`.
- **MinIO (product images)**: Not included in this script. Back up the `minio_data` volume or use `mc mirror` if you need image backups.
- **Redis**: Persisted via AOF in the `redis_data` volume; optional extra: copy the volume or run `BGSAVE` and copy the RDB file.
