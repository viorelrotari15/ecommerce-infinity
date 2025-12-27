# Testing Guide - MinIO Image Storage Feature

## Prerequisites

1. Docker and Docker Compose installed
2. Node.js and npm installed
3. Access to terminal/command line

## Step 1: Database Migration

First, create the database migration for the new `ProductImage` model:

```bash
cd apps/backend
npx prisma migrate dev --name add_product_images
npx prisma generate
```

**Expected Output:**
- Migration file created in `prisma/migrations/`
- `ProductImage` table created in database
- Prisma client regenerated

**Verify:**
```bash
# Check migration was created
ls -la apps/backend/prisma/migrations/

# Verify schema
cat apps/backend/prisma/schema.prisma | grep -A 15 "model ProductImage"
```

## Step 2: Start Services

Start all services using Docker Compose:

```bash
# From project root
docker compose up -d
```

**Expected Output:**
- All containers start successfully
- Services accessible on their ports

**Verify Services:**
```bash
# Check all containers are running
docker compose ps

# Check logs for errors
docker compose logs backend
docker compose logs minio
```

**Expected Services:**
- ✅ `ecommerce-postgres` (port 5433)
- ✅ `ecommerce-backend` (port 3001)
- ✅ `ecommerce-frontend` (port 3000)
- ✅ `ecommerce-minio` (port 9000)
- ✅ `ecommerce-minio-setup` (completed)

## Step 3: Verify MinIO Setup

### 3.1 Access MinIO Console

1. Open browser: http://localhost:9001
2. Login with:
   - **Username:** `minioadmin`
   - **Password:** `minioadmin`

**Expected:**
- ✅ Console loads successfully
- ✅ `products` bucket exists
- ✅ Bucket is set to public access

### 3.2 Verify MinIO API

Test direct MinIO access:

```bash
# Test MinIO health endpoint
curl http://localhost:9000/minio/health/live

# Expected: HTTP 200 OK
```

## Step 4: Test Backend API

### 4.1 Test Authentication

First, get an admin token:

```bash
# Login as admin
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "admin123"
  }'
```

**Expected Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "...",
    "email": "admin@example.com",
    "role": "ADMIN"
  }
}
```

**Save the token:**
```bash
export TOKEN="your-token-here"
```

### 4.2 Test Product Creation

Create a product first (images need a product ID):

```bash
# Get brands, categories, and product types
curl http://localhost:3001/api/brands
curl http://localhost:3001/api/categories
curl http://localhost:3001/api/product-types

# Create a product
curl -X POST http://localhost:3001/api/products \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Product",
    "slug": "test-product",
    "sku": "TEST-001",
    "description": "Test product description",
    "shortDescription": "Test",
    "brandId": "<brand-id-from-above>",
    "productTypeId": "<product-type-id-from-above>",
    "categoryIds": ["<category-id-from-above>"],
    "variants": [{
      "name": "50ml",
      "sku": "TEST-001-50",
      "price": 99.99,
      "stock": 10,
      "isActive": true
    }],
    "isActive": true,
    "isFeatured": false
  }'
```

**Expected Response:**
```json
{
  "id": "product-uuid",
  "name": "Test Product",
  "slug": "test-product",
  ...
}
```

**Save the product ID:**
```bash
export PRODUCT_ID="product-uuid-here"
```

### 4.3 Test Image Upload

Create a test image file:

```bash
# Create a simple test image (1x1 pixel PNG)
echo "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" | base64 -d > /tmp/test-image.png
```

Upload the image:

```bash
curl -X POST http://localhost:3001/api/images/products/$PRODUCT_ID \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/tmp/test-image.png" \
  -F "isPrimary=true" \
  -F "order=0"
```

**Expected Response:**
```json
{
  "id": "image-uuid",
  "productId": "product-uuid",
  "bucket": "products",
  "filepath": "products/category/brand/product-id/uuid.png",
  "filename": "uuid.png",
  "size": 95,
  "mimeType": "image/png",
  "isPrimary": true,
  "order": 0,
  "url": "http://localhost:9000/products/..."
}
```

### 4.4 Test Get Product Images

```bash
curl http://localhost:3001/api/images/products/$PRODUCT_ID \
  -H "Authorization: Bearer $TOKEN"
```

**Expected:** Array of image objects with URLs

### 4.5 Test Get Product with Images

```bash
curl http://localhost:3001/api/products/test-product
```

**Expected:** Product object with `productImages` array containing image URLs

### 4.6 Test Image Deletion

```bash
# Get image ID from previous response
export IMAGE_ID="image-uuid-here"

curl -X DELETE http://localhost:3001/api/images/$IMAGE_ID \
  -H "Authorization: Bearer $TOKEN"
```

**Expected:** `{"message": "Image deleted successfully"}`

## Step 5: Test Frontend

### 5.1 Access Frontend

1. Open browser: http://localhost:3000
2. Verify the homepage loads

### 5.2 Login as Admin

1. Navigate to: http://localhost:3000/auth/login
2. Login with:
   - **Email:** `admin@example.com`
   - **Password:** `admin123`

**Expected:**
- ✅ Login successful
- ✅ Redirected to homepage

### 5.3 Create Product via Admin UI

1. Navigate to: http://localhost:3000/admin/products/new
2. Fill in the form:
   - Product Name: "Test Product UI"
   - Slug: "test-product-ui"
   - SKU: "TEST-UI-001"
   - Select Brand, Product Type, Categories
   - Add at least one variant
3. Click "Create Product"

**Expected:**
- ✅ Product created successfully
- ✅ Form shows "Product created! You can now upload images"

### 5.4 Upload Images via UI

1. After product creation, click the upload area
2. Select 1-5 image files (JPEG, PNG, WebP)
3. Images should upload and display as thumbnails

**Expected:**
- ✅ Images upload successfully
- ✅ Thumbnails appear
- ✅ First image marked as "Primary"
- ✅ Can delete images with X button

### 5.5 Verify Images Display

1. Navigate to: http://localhost:3000/products
2. Find your test product
3. Click on it to view details

**Expected:**
- ✅ Product images display correctly
- ✅ Primary image shows in main view
- ✅ Additional images show in gallery
- ✅ Images load from MinIO URL (http://localhost:9000/...)

### 5.6 Test Image URLs

Check browser console/network tab:
- Images should load from: `http://localhost:9000/products/...`
- No CORS errors
- Images display correctly

## Step 6: Verify MinIO Storage

### 6.1 Check MinIO Console

1. Go to: http://localhost:9001
2. Navigate to `products` bucket
3. Browse the folder structure

**Expected Structure:**
```
products/
  └── {category}/
      └── {brand}/
          └── {productId}/
              └── {uuid}.{ext}
```

### 6.2 Verify File Access

Test direct image URL:

```bash
# Get image URL from API response
curl -I "http://localhost:9000/products/category/brand/product-id/image.png"
```

**Expected:**
- ✅ HTTP 200 OK
- ✅ Content-Type: image/png (or image/jpeg)
- ✅ Image downloads correctly

## Step 7: Test Edge Cases

### 7.1 Invalid File Types

```bash
# Try uploading a non-image file
echo "not an image" > /tmp/test.txt

curl -X POST http://localhost:3001/api/images/products/$PRODUCT_ID \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/tmp/test.txt"
```

**Expected:** Error message about invalid file type

### 7.2 Upload Without Authentication

```bash
curl -X POST http://localhost:3001/api/images/products/$PRODUCT_ID \
  -F "file=@/tmp/test-image.png"
```

**Expected:** 401 Unauthorized

### 7.3 Upload to Non-existent Product

```bash
curl -X POST http://localhost:3001/api/images/products/non-existent-id \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/tmp/test-image.png"
```

**Expected:** 404 Not Found

### 7.4 Upload More Than 5 Images

Try uploading 6 images to the same product.

**Expected:** Should work (no hard limit in code, but UI shows max 5)

## Step 8: Database Verification

### 8.1 Check Database Records

```bash
# Connect to database
docker exec -it ecommerce-postgres psql -U postgres -d ecommerce

# Check ProductImage table
SELECT * FROM product_images;

# Check product relationship
SELECT p.name, COUNT(pi.id) as image_count
FROM products p
LEFT JOIN product_images pi ON p.id = pi."productId"
GROUP BY p.id, p.name;
```

**Expected:**
- ✅ Image records exist
- ✅ Correct product relationships
- ✅ Metadata stored correctly

## Step 9: Cleanup Test Data

After testing, you may want to clean up:

```bash
# Delete test product (cascades to images)
curl -X DELETE http://localhost:3001/api/products/$PRODUCT_ID \
  -H "Authorization: Bearer $TOKEN"
```

**Expected:**
- ✅ Product deleted
- ✅ Images deleted from MinIO
- ✅ Database records removed

## Troubleshooting

### Images Not Loading

1. **Check MinIO is running:**
   ```bash
   docker compose ps | grep minio
   ```

2. **Check bucket exists:**
   - Visit MinIO Console
   - Verify `products` bucket exists

3. **Check environment variables:**
   ```bash
   docker compose exec backend env | grep MINIO
   ```

4. **Check CORS (if needed):**
   - MinIO should allow public access in dev
   - Check browser console for CORS errors

### Upload Fails

1. **Check authentication:**
   - Verify token is valid
   - Check token hasn't expired

2. **Check file size:**
   - No hard limit, but very large files may timeout

3. **Check file type:**
   - Only JPEG, PNG, WebP allowed

4. **Check backend logs:**
   ```bash
   docker compose logs backend | tail -50
   ```

### Database Errors

1. **Run migrations:**
   ```bash
   cd apps/backend
   npx prisma migrate deploy
   ```

2. **Regenerate Prisma client:**
   ```bash
   npx prisma generate
   ```

3. **Check database connection:**
   ```bash
   docker compose exec postgres psql -U postgres -d ecommerce -c "SELECT 1;"
   ```

## Success Criteria

✅ All tests pass
✅ Images upload successfully
✅ Images display on frontend
✅ Images accessible via direct URL
✅ Database stores metadata correctly
✅ MinIO stores files correctly
✅ Admin UI works end-to-end
✅ Product pages show images correctly

## Next Steps After Testing

1. **Production Preparation:**
   - Update environment variables for production
   - Configure Cloudflare CDN
   - Set up proper MinIO security

2. **Optimization:**
   - Add image resizing/compression
   - Implement lazy loading
   - Add image alt text for SEO

3. **Monitoring:**
   - Set up MinIO monitoring
   - Track image storage usage
   - Monitor CDN performance


