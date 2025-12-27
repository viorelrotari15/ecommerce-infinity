# Run Migration and Seed with Images

## Quick Start

Run the automated script:

```bash
./seed-with-images.sh
```

This script will:
1. ✅ Check if services are running
2. ✅ Run database migration
3. ✅ Generate Prisma client
4. ✅ Seed products
5. ✅ Seed images to MinIO

## Manual Steps

If you prefer to run steps manually:

### 1. Ensure Services Are Running

```bash
docker compose up -d postgres minio
```

Wait a few seconds for services to be ready.

### 2. Run Migration

```bash
cd apps/backend
npx prisma migrate dev --name add_product_images
npx prisma generate
```

### 3. Seed Products

```bash
npm run prisma:seed
```

### 4. Seed Images

```bash
# Make sure MinIO is accessible
# Then run:
npm run prisma:seed:images
```

## Environment Variables

The script uses these defaults (can be overridden with `.env` file):

- `DATABASE_URL`: `postgresql://postgres:postgres@localhost:5433/ecommerce`
- `MINIO_ENDPOINT`: `localhost`
- `MINIO_PORT`: `9000`
- `MINIO_ACCESS_KEY`: `minioadmin`
- `MINIO_SECRET_KEY`: `minioadmin`
- `MINIO_BUCKET`: `products`

## What Gets Created

- **Products**: 5 sample products (Elegance Classic, Aurora Fresh, Noir Mystique, etc.)
- **Images**: 2-3 placeholder images per product
- **Storage**: Images stored in MinIO at `products/{category}/{brand}/{productId}/{uuid}.png`
- **Database**: ProductImage records with metadata

## Verify Results

1. **Check Database:**
   ```bash
   docker exec -it ecommerce-postgres psql -U postgres -d ecommerce -c "SELECT COUNT(*) FROM product_images;"
   ```

2. **Check MinIO Console:**
   - Visit http://localhost:9001
   - Login: minioadmin/minioadmin
   - Browse `products` bucket

3. **Check API:**
   ```bash
   curl http://localhost:3001/api/products | jq '.data[0].productImages'
   ```

4. **Check Frontend:**
   - Visit http://localhost:3000/products
   - Products should display with placeholder images

## Troubleshooting

### Migration Fails

- Ensure PostgreSQL is running: `docker compose ps | grep postgres`
- Check database connection: `docker compose exec postgres psql -U postgres -d ecommerce -c "SELECT 1;"`

### Image Seeding Fails

- Ensure MinIO is running: `docker compose ps | grep minio`
- Check MinIO health: `curl http://localhost:9000/minio/health/live`
- Verify bucket exists in MinIO Console

### Environment Variables Not Found

- Create `.env` file in project root with required variables
- Or ensure docker-compose.yml has correct defaults

## Next Steps

After seeding:
1. ✅ Products have images
2. ✅ Images accessible via API
3. ✅ Images display on frontend
4. ✅ Ready for testing!


