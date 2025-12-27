# MinIO Image Storage Setup Guide

## Overview

This guide explains the MinIO image storage system integrated into the e-commerce platform. The system supports:
- **Development**: Local MinIO with direct access
- **Production**: Cloudflare CDN with MinIO as origin

## Architecture

### Development Flow
```
Next.js → NestJS API → MinIO (localhost:9000)
         → Postgres (local)
```

### Production Flow
```
Client → Cloudflare CDN (cdn.myshop.com)
       → MinIO (internal, not public)
       → Postgres (production)
```

## File Structure

Images are stored with the following path structure:
```
products/{category}/{brand}/{productId}/{uuid}.{ext}
```

Example:
```
products/women/chanel/abc-123-def/uuid-456.jpg
```

## Database Schema

The `ProductImage` model stores metadata:
- `id`: UUID
- `productId`: Reference to product
- `bucket`: MinIO bucket name (default: "products")
- `filepath`: Full path in MinIO
- `filename`: Original filename
- `size`: File size in bytes
- `mimeType`: MIME type (image/jpeg, image/png, etc.)
- `isPrimary`: Boolean flag for primary image
- `order`: Display order
- `createdAt`, `updatedAt`: Timestamps

## Setup Instructions

### 1. Database Migration

Run the Prisma migration to create the `ProductImage` table:

```bash
cd apps/backend
npx prisma migrate dev --name add_product_images
npx prisma generate
```

### 2. Environment Variables

Create or update your `.env` file with MinIO configuration:

```bash
# MinIO Configuration (Development)
MINIO_ENDPOINT=minio
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=products
MINIO_CONSOLE_PORT=9001

# Image URL Configuration
MINIO_PUBLIC_URL=http://localhost:9000
NEXT_PUBLIC_CDN_URL=http://localhost:9000
```

### 3. Start Services

Start all services with Docker Compose:

```bash
docker compose up -d
```

This will start:
- PostgreSQL
- MinIO (port 9000)
- MinIO Console (port 9001)
- Backend API
- Frontend

### 4. Access MinIO Console

1. Open http://localhost:9001
2. Login with:
   - Username: `minioadmin`
   - Password: `minioadmin`
3. Verify the `products` bucket exists and is public

### 5. Test Image Upload

1. Login as admin at http://localhost:3000/auth/login
2. Navigate to http://localhost:3000/admin/products/new
3. Create a product
4. Upload images (up to 5 per product)

## API Endpoints

### Image Management

#### Upload Image
```
POST /api/images/products/:productId
Authorization: Bearer <token>
Content-Type: multipart/form-data

Body:
- file: File
- isPrimary?: boolean
- order?: number
```

#### Get Product Images
```
GET /api/images/products/:productId
```

#### Delete Image
```
DELETE /api/images/:imageId
Authorization: Bearer <token> (Admin only)
```

#### Set Primary Image
```
PATCH /api/images/:imageId/primary
Authorization: Bearer <token> (Admin only)
```

### Product Management

#### Create Product
```
POST /api/products
Authorization: Bearer <token> (Admin only)

Body: {
  name: string
  slug: string
  sku: string
  brandId: string
  productTypeId: string
  categoryIds: string[]
  variants: Array<{name, sku, price, stock}>
  // ... other fields
}
```

#### Update Product
```
PATCH /api/products/:id
Authorization: Bearer <token> (Admin only)
```

#### Delete Product
```
DELETE /api/products/:id
Authorization: Bearer <token> (Admin only)
```

## Frontend Usage

### Image URL Utility

Use the `getImageUrl` utility to get proper image URLs:

```typescript
import { getProductImageUrl, getPrimaryProductImage } from '@/lib/images';

// Get primary image URL
const primaryImage = getPrimaryProductImage(product.productImages);

// Get specific image URL
const imageUrl = getProductImageUrl(product.productImages[0]);
```

### Upload Images

```typescript
import { uploadImage } from '@/lib/api';

const token = localStorage.getItem('token');
const file = // File from input

await uploadImage(productId, file, token, {
  isPrimary: true,
  order: 0
});
```

## Production Setup

### 1. Update Environment Variables

```bash
# Production MinIO (Internal)
MINIO_ENDPOINT=minio.internal
MINIO_PORT=9000
MINIO_USE_SSL=true
MINIO_ACCESS_KEY=<secure-access-key>
MINIO_SECRET_KEY=<secure-secret-key>
MINIO_BUCKET=products

# CDN Configuration
MINIO_PUBLIC_URL=https://cdn.myshop.com
NEXT_PUBLIC_CDN_URL=https://cdn.myshop.com
```

### 2. Cloudflare CDN Setup

1. **Create DNS Record**:
   - Type: CNAME
   - Name: `cdn`
   - Target: Your MinIO public endpoint (or use Cloudflare Workers)

2. **Configure Caching**:
   - Cache Level: Cache Everything
   - Edge Cache TTL: 1 month
   - Browser Cache TTL: 1 month

3. **Security**:
   - Ensure MinIO is NOT publicly accessible
   - Use Cloudflare Workers to proxy requests
   - Enable SSL/TLS

### 3. MinIO Security

In production:
- Remove public bucket access
- Use Cloudflare CDN as the only public endpoint
- Enable SSL/TLS
- Use strong access keys

## Troubleshooting

### Images Not Loading

1. Check MinIO is running: `docker ps | grep minio`
2. Verify bucket exists and is public
3. Check environment variables
4. Verify image URLs in browser console

### Upload Fails

1. Check authentication token
2. Verify product exists
3. Check file size limits (default: no limit, but consider adding)
4. Verify MIME type is allowed (jpeg, jpg, png, webp)

### Database Errors

1. Run migrations: `npx prisma migrate deploy`
2. Regenerate Prisma client: `npx prisma generate`
3. Check database connection

## Best Practices

1. **Image Optimization**: Consider adding image optimization (resize, compress) before upload
2. **File Size Limits**: Add validation for maximum file size
3. **CDN Caching**: Configure proper cache headers
4. **Error Handling**: Implement retry logic for failed uploads
5. **Image Formats**: Support modern formats (WebP, AVIF) for better performance

## File Limits

- Maximum images per product: 5
- Allowed formats: JPEG, JPG, PNG, WebP
- Recommended max file size: 5MB per image

## Next Steps

1. Add image optimization (resize, compress)
2. Implement image lazy loading
3. Add image alt text for SEO
4. Implement image deletion on product deletion
5. Add image reordering UI

