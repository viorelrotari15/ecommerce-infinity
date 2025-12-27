# Migration and Image Seeding Summary

## ✅ What Was Created

### 1. Database Migration
- **File**: Prisma migration for `ProductImage` model
- **Command**: `npx prisma migrate dev --name add_product_images`
- **Creates**: `product_images` table in PostgreSQL

### 2. Image Seeding Script
- **File**: `apps/backend/prisma/seed-images.ts`
- **Purpose**: Creates placeholder images in MinIO and ProductImage records
- **Features**:
  - Creates 2-3 placeholder images per product
  - Uploads to MinIO with proper path structure
  - Creates database records with metadata
  - Skips products that already have images

### 3. Automated Script
- **File**: `seed-with-images.sh`
- **Purpose**: Runs migration and seeding in one command
- **Steps**:
  1. Checks if services are running
  2. Runs database migration
  3. Generates Prisma client
  4. Seeds products
  5. Seeds images

## 🚀 How to Use

### Option 1: Automated (Recommended)

```bash
./seed-with-images.sh
```

### Option 2: Manual Steps

```bash
# 1. Start services
docker compose up -d postgres minio

# 2. Run migration
cd apps/backend
npx prisma migrate dev --name add_product_images
npx prisma generate

# 3. Seed products
npm run prisma:seed

# 4. Seed images
npm run prisma:seed:images
```

## 📦 What Gets Created

### Products (from existing seed)
- Elegance Classic
- Aurora Fresh
- Noir Mystique
- Elegance Rose
- Aurora Sport

### Images (new)
- **2-3 placeholder images** per product
- Stored in MinIO at: `products/{category}/{brand}/{productId}/{uuid}.png`
- Database records in `product_images` table
- First image marked as `isPrimary: true`

## 🔍 Verify Results

### Check Database
```bash
docker exec -it ecommerce-postgres psql -U postgres -d ecommerce \
  -c "SELECT p.name, COUNT(pi.id) as image_count 
      FROM products p 
      LEFT JOIN product_images pi ON p.id = pi.\"productId\" 
      GROUP BY p.id, p.name;"
```

### Check MinIO
1. Visit http://localhost:9001
2. Login: `minioadmin` / `minioadmin`
3. Browse `products` bucket
4. Verify folder structure: `products/{category}/{brand}/{productId}/`

### Check API
```bash
# Get products with images
curl http://localhost:3001/api/products | jq '.data[0] | {name, productImages}'

# Get specific product
curl http://localhost:3001/api/products/elegance-classic | jq '.productImages'
```

### Check Frontend
1. Visit http://localhost:3000/products
2. Products should display with placeholder images
3. Click on a product to see image gallery

## 🎨 Image Details

### Placeholder Images
- Format: PNG
- Size: 1x1 pixel (transparent)
- Purpose: Placeholder until real images are uploaded
- Location: MinIO bucket `products`

### Image Metadata
Each image record includes:
- `bucket`: "products"
- `filepath`: Full path in MinIO
- `filename`: UUID-based filename
- `size`: File size in bytes
- `mimeType`: "image/png"
- `isPrimary`: Boolean (first image)
- `order`: Display order (0, 1, 2...)

## 🔧 Environment Variables

The script uses these defaults (can be overridden):

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/ecommerce
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=products
```

## ⚠️ Troubleshooting

### "Environment variable not found: DATABASE_URL"
- The script sets defaults, but if you have a `.env` file, it will use those values
- Check that PostgreSQL is running: `docker compose ps | grep postgres`

### "MinIO connection failed"
- Ensure MinIO is running: `docker compose ps | grep minio`
- Check MinIO health: `curl http://localhost:9000/minio/health/live`
- Verify credentials in MinIO Console

### "Products already have images"
- This is normal - the script skips products that already have images
- To re-seed, delete existing images first or modify the script

## 📝 Next Steps

After seeding:
1. ✅ Products have placeholder images
2. ✅ Images accessible via API
3. ✅ Images display on frontend
4. ✅ Ready to upload real images via admin UI!

To upload real images:
1. Login as admin
2. Go to `/admin/products/new` or edit existing product
3. Upload real images (they'll replace placeholders)


