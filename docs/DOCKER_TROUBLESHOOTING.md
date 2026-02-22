# Docker troubleshooting

## Backend fails to start (“dependency backend failed to start”)

When the backend container exits before becoming healthy, other services (frontend, nginx) wait for it and may report “dependency backend failed to start”.

### 1. Check backend logs

See why the backend exited:

```bash
docker compose -f docker-compose.prod.yml logs backend
```

If you use the tunnel override:

```bash
docker compose -f docker-compose.prod.yml -f docker-compose.tunnel.yml logs backend
```

### 2. Common causes

- **Missing `JWT_SECRET`**  
  The backend requires `JWT_SECRET` and exits with a clear message if it’s missing.  
  **Fix:** Set `JWT_SECRET` in your `.env` (e.g. a long random string). See `.env.example`.

- **MinIO / storage env**  
  For product images the backend needs MinIO-related env: `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, and optionally `MINIO_PUBLIC_URL`.  
  **Fix:** Copy the MinIO block from `.env.example` and set values (for tunnel/local, `MINIO_USE_SSL=false` and `MINIO_ENDPOINT=minio`).

- **Database or migrations**  
  If logs show Prisma errors or “migrate deploy” failures, check:
  - Postgres is healthy and `DATABASE_URL` in `.env` matches your compose (user, password, host `postgres`, port `5432`, database name).
  - You have run migrations (the prod compose runs `prisma migrate deploy` on backend startup; if it fails, fix the DB or migration and restart).

- **Build or install failures**  
  If logs show `npm install` or `npm run build` errors, fix the reported issue (e.g. dependency or TypeScript error), rebuild the backend image, and restart:
  ```bash
  docker compose -f docker-compose.prod.yml build backend
  docker compose -f docker-compose.prod.yml up -d
  ```

### 3. Orphan containers warning

If you see “Found orphan containers” (e.g. prometheus, grafana, loki), you can remove them so they don’t clutter:

```bash
docker compose -f docker-compose.prod.yml -f docker-compose.tunnel.yml up -d --remove-orphans
```

Use `--remove-orphans` only when you’re sure those containers are no longer part of this project.
