# Environment Configuration Guide

## Development Environment

### Local Development Setup

The development environment uses local MinIO and PostgreSQL services running in Docker.

**Required Environment Variables:**

```bash
# Database
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=ecommerce
DB_PORT=5433

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d

# MinIO (Development)
MINIO_ENDPOINT=minio
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=products
MINIO_CONSOLE_PORT=9001

# Image URLs (Development)
MINIO_PUBLIC_URL=http://localhost:9000
NEXT_PUBLIC_CDN_URL=http://localhost:9000
```

### Development Image URLs

In development, images are accessible directly from MinIO:
- **MinIO Console**: http://localhost:9001 (admin/minioadmin)
- **Image URLs**: http://localhost:9000/products/{category}/{brand}/{productId}/{filename}.jpg

## Production Environment

### Production Architecture

```
Client → Cloudflare CDN → MinIO (internal)
       → Next.js (API) → NestJS → MinIO (internal)
```

### Production Environment Variables

```bash
# Database (Production)
DATABASE_URL=postgresql://user:password@postgres-prod:5432/ecommerce

# JWT (Production)
JWT_SECRET=your-very-secure-production-secret
JWT_EXPIRES_IN=7d

# MinIO (Production - Internal)
MINIO_ENDPOINT=minio.internal
MINIO_PORT=9000
MINIO_USE_SSL=true
MINIO_ACCESS_KEY=your-production-access-key
MINIO_SECRET_KEY=your-production-secret-key
MINIO_BUCKET=products

# Image URLs (Production - CDN)
MINIO_PUBLIC_URL=https://cdn.myshop.com
NEXT_PUBLIC_CDN_URL=https://cdn.myshop.com
```

### Production URL Strategy

1. **CDN Domain**: `cdn.myshop.com`
2. **Image Path Pattern**: `https://cdn.myshop.com/products/{category}/{brand}/{productId}/{filename}.jpg`
3. **MinIO Internal**: Not publicly accessible, only via CDN
4. **Cloudflare Setup**:
   - Origin: MinIO internal endpoint
   - Caching: Aggressive caching for images
   - Cache-Control headers set by MinIO

### Cloudflare CDN Configuration

1. **Create DNS Record**:
   - Type: CNAME
   - Name: cdn
   - Target: Your MinIO public endpoint (or use Cloudflare Workers)

2. **Page Rules** (Optional):
   - Cache Level: Cache Everything
   - Edge Cache TTL: 1 month
   - Browser Cache TTL: 1 month

3. **Worker Script** (Recommended):
   ```javascript
   addEventListener('fetch', event => {
     event.respondWith(handleRequest(event.request))
   })

   async function handleRequest(request) {
     const url = new URL(request.url)
     // Proxy to MinIO internal endpoint
     const minioUrl = `http://minio.internal:9000${url.pathname}`
     return fetch(minioUrl, {
       headers: {
         'Host': 'minio.internal',
       }
     })
   }
   ```

## Environment Variable Reference

### Backend (NestJS)

| Variable | Development | Production | Description |
|----------|-------------|------------|-------------|
| `MINIO_ENDPOINT` | `minio` | `minio.internal` | MinIO server hostname |
| `MINIO_PORT` | `9000` | `9000` | MinIO server port |
| `MINIO_USE_SSL` | `false` | `true` | Use SSL for MinIO |
| `MINIO_ACCESS_KEY` | `minioadmin` | `secure-key` | MinIO access key |
| `MINIO_SECRET_KEY` | `minioadmin` | `secure-secret` | MinIO secret key |
| `MINIO_BUCKET` | `products` | `products` | Default bucket name |
| `MINIO_PUBLIC_URL` | `http://localhost:9000` | `https://cdn.myshop.com` | Public URL for images |

### Frontend (Next.js)

| Variable | Development | Production | Description |
|----------|-------------|------------|-------------|
| `NEXT_PUBLIC_CDN_URL` | `http://localhost:9000` | `https://cdn.myshop.com` | CDN URL for images |

## Security Notes

1. **Development**: MinIO is publicly accessible (for local testing only)
2. **Production**: 
   - MinIO should NOT be publicly accessible
   - Use Cloudflare CDN as the only public endpoint
   - Use strong access keys and secrets
   - Enable SSL/TLS for all connections

## Migration from Development to Production

1. Update environment variables
2. Configure Cloudflare CDN
3. Update MinIO bucket policies (remove public access, use CDN only)
4. Test image URLs
5. Update frontend environment variables
6. Deploy backend with new configuration

