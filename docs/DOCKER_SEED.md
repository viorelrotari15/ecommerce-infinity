# Run Migration and Seed in Docker Compose

## Quick Start

Run the automated script:

```bash
./docker-seed.sh
```

This script will:
1. ✅ Check if services are running
2. ✅ Wait for PostgreSQL and MinIO to be ready
3. ✅ Run database migration inside backend container
4. ✅ Generate Prisma client
5. ✅ Seed products
6. ✅ Seed images to MinIO

## Manual Steps

If you prefer to run steps manually inside Docker:

### 1. Ensure Services Are Running

```bash
docker compose up -d
```

### 2. Run Migration

```bash
docker compose exec backend npx prisma migrate dev --name add_product_images
docker compose exec backend npx prisma generate
```

### 3. Seed Products

```bash
docker compose exec backend npm run prisma:seed
```

### 4. Seed Images

```bash
docker compose exec backend npm run prisma:seed:images
```

## One-Line Command

You can also run everything in one command:

```bash
docker compose exec backend sh -c "npx prisma migrate dev --name add_product_images && npx prisma generate && npm run prisma:seed && npm run prisma:seed:images"
```

## Environment Variables

When running inside Docker, the backend container automatically has:
- `DATABASE_URL`: `postgresql://postgres:postgres@postgres:5432/ecommerce`
- `MINIO_ENDPOINT`: `minio` (Docker service name)
- `MINIO_PORT`: `9000`
- `MINIO_ACCESS_KEY`: `minioadmin`
- `MINIO_SECRET_KEY`: `minioadmin`
- `MINIO_BUCKET`: `products`

These are set in `docker-compose.yml` and work automatically.

## What Gets Created

- **Products**: 5 sample products
- **Images**: 2-3 placeholder images per product
- **Storage**: Images in MinIO at `products/{category}/{brand}/{productId}/{uuid}.png`
- **Database**: ProductImage records with metadata

## Verify Results

### Check Database
```bash
docker compose exec postgres psql -U postgres -d ecommerce \
  -c "SELECT p.name, COUNT(pi.id) as image_count 
      FROM products p 
      LEFT JOIN product_images pi ON p.id = pi.\"productId\" 
      GROUP BY p.id, p.name;"
```

### Check MinIO Console
1. Visit http://localhost:9001
2. Login: `minioadmin` / `minioadmin`
3. Browse `products` bucket

### Check API
```bash
curl http://localhost:3001/api/products | jq '.data[0].productImages'
```

### Check Frontend
Visit http://localhost:3000/products - products should display with images

## Troubleshooting

### Container Not Running
```bash
docker compose up -d
docker compose ps
```

### Migration Fails
```bash
# Check backend logs
docker compose logs backend

# Check database connection
docker compose exec postgres psql -U postgres -d ecommerce -c "SELECT 1;"
```

### Image Seeding Fails
```bash
# Check MinIO is accessible from backend container
docker compose exec backend curl http://minio:9000/minio/health/live

# Check backend logs
docker compose logs backend | grep -i minio
```

### Permission Issues
```bash
# Ensure scripts are executable
chmod +x docker-seed.sh
```

## Differences: Docker vs Local

| Aspect | Docker | Local |
|--------|--------|-------|
| MinIO Endpoint | `minio` (service name) | `localhost` |
| Database Host | `postgres` (service name) | `localhost` |
| Database Port | `5432` (internal) | `5433` (mapped) |
| Environment | Auto-set by docker-compose | From `.env` file |

## Next Steps

After seeding:
1. ✅ Products have images
2. ✅ Images accessible via API
3. ✅ Images display on frontend
4. ✅ Ready for testing!


