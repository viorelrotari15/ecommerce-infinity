# Local Development with Fly.io Services

This guide explains how to develop locally while using Fly.io services (database, MinIO) or connect your local frontend to a deployed backend.

> **For fully local development (everything on your machine), see [LOCAL_DEVELOPMENT.md](LOCAL_DEVELOPMENT.md)**

## Scenarios

### Scenario 1: Local Frontend + Local Backend + Fly.io Database + Fly.io MinIO

Use Fly.io database and MinIO for local development.

#### Setup

1. **Get Fly.io Database Connection String**

```bash
# If using Fly.io Postgres
fly postgres connect --app yourname-ecommerce-db

# Or get the connection string
fly secrets list --app yourname-ecommerce-backend | grep DATABASE_URL
```

2. **Create `.env.local` in `apps/backend/`**

```bash
# Database - Use Fly.io Postgres
DATABASE_URL="postgresql://user:password@yourname-ecommerce-db.fly.dev:5432/database?sslmode=require"

# JWT
JWT_SECRET="your-local-jwt-secret"
JWT_EXPIRES_IN="7d"

# MinIO - Use Fly.io MinIO (if you have one) or local
MINIO_ENDPOINT="your-minio-app.fly.dev"
MINIO_PORT="443"
MINIO_USE_SSL="true"
MINIO_ACCESS_KEY="your-access-key"
MINIO_SECRET_KEY="your-secret-key"
MINIO_BUCKET="products"
MINIO_PUBLIC_URL="https://your-minio-app.fly.dev"

# CORS
FRONTEND_URL="http://localhost:3000"
PORT="3001"
```

3. **Create `.env.local` in `apps/frontend/`**

```bash
NEXT_PUBLIC_API_URL="http://localhost:3001"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_CDN_URL="https://your-minio-app.fly.dev"
```

4. **Run Backend Locally**

```bash
cd apps/backend
npm install
npx prisma generate
npx prisma migrate deploy  # Or db push for development
npm run start:dev
```

5. **Run Frontend Locally**

```bash
cd apps/frontend
npm install
npm run dev
```

### Scenario 2: Local Frontend + Deployed Backend on Fly.io

Connect your local Next.js frontend to the deployed backend.

#### Setup

1. **Create `.env.local` in `apps/frontend/`**

```bash
# Point to deployed backend
NEXT_PUBLIC_API_URL="https://yourname-ecommerce-backend.fly.dev"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_CDN_URL="https://your-cdn-url.fly.dev"
```

2. **Update Backend CORS (if needed)**

Make sure your deployed backend allows `http://localhost:3000`:

```bash
fly secrets set FRONTEND_URL="https://yourname-ecommerce-frontend.fly.dev,http://localhost:3000" --app yourname-ecommerce-backend
```

Or update the backend code to allow multiple origins:

```typescript
// apps/backend/src/main.ts
app.enableCors({
  origin: process.env.FRONTEND_URL?.split(',') || ['http://localhost:3000'],
  credentials: true,
});
```

3. **Run Frontend Locally**

```bash
cd apps/frontend
npm install
npm run dev
```

Your local frontend at `http://localhost:3000` will now connect to the deployed backend.

### Scenario 3: Local Everything + Fly.io Database Only

Use Fly.io database but local MinIO and services.

#### Setup

1. **Start Local Services (MinIO, etc.)**

```bash
# Start only MinIO locally
docker compose up minio -d
```

2. **Create `.env.local` in `apps/backend/`**

```bash
# Database - Use Fly.io Postgres
DATABASE_URL="postgresql://user:password@yourname-ecommerce-db.fly.dev:5432/database?sslmode=require"

# MinIO - Use Local
MINIO_ENDPOINT="localhost"
MINIO_PORT="9000"
MINIO_USE_SSL="false"
MINIO_ACCESS_KEY="minioadmin"
MINIO_SECRET_KEY="minioadmin"
MINIO_BUCKET="products"
MINIO_PUBLIC_URL="http://localhost:9000"

# Other configs...
FRONTEND_URL="http://localhost:3000"
PORT="3001"
JWT_SECRET="your-local-jwt-secret"
JWT_EXPIRES_IN="7d"
```

## Connecting to Fly.io Postgres

### Option 1: Direct Connection (Recommended for Development)

Fly.io Postgres databases are accessible from anywhere with the connection string.

```bash
# Get connection string
fly postgres connect --app yourname-ecommerce-db

# Or view secrets
fly secrets list --app yourname-ecommerce-backend
```

**Note**: You may need to allow connections from your IP. Check Fly.io dashboard for IP allowlist settings.

### Option 2: SSH Tunnel (More Secure)

Create an SSH tunnel to the database:

```bash
# Create a proxy
fly proxy 5432 -a yourname-ecommerce-db

# In another terminal, use localhost:5432
DATABASE_URL="postgresql://user:password@localhost:5432/database"
```

### Option 3: WireGuard VPN (Most Secure)

Set up WireGuard VPN to connect to Fly.io private network:

```bash
# Install WireGuard
fly wireguard create

# Connect
fly wireguard connect
```

Then use the internal database hostname in your connection string.

## Connecting to Fly.io MinIO

If you have MinIO deployed on Fly.io:

### Get MinIO Credentials

```bash
fly secrets list --app yourname-ecommerce-backend | grep MINIO
```

### Use in Local Development

```bash
# In apps/backend/.env.local
MINIO_ENDPOINT="your-minio-app.fly.dev"
MINIO_PORT="443"
MINIO_USE_SSL="true"
MINIO_ACCESS_KEY="your-access-key"
MINIO_SECRET_KEY="your-secret-key"
MINIO_BUCKET="products"
MINIO_PUBLIC_URL="https://your-minio-app.fly.dev"
```

## Environment File Priority

Next.js and NestJS load environment variables in this order:

1. `.env.local` (highest priority, not committed to git)
2. `.env.development` or `.env.production`
3. `.env`

**Recommendation**: Use `.env.local` for local development with Fly.io services.

## Troubleshooting

### Database Connection Issues

1. **Check if database is accessible:**
   ```bash
   psql "postgresql://user:password@yourname-ecommerce-db.fly.dev:5432/database?sslmode=require"
   ```

2. **Verify IP allowlist** (if enabled in Fly.io)

3. **Use SSH tunnel** if direct connection fails

### CORS Issues

If you get CORS errors when connecting local frontend to deployed backend:

1. Check `FRONTEND_URL` secret in Fly.io
2. Update backend to allow `localhost:3000`
3. Restart backend: `fly apps restart yourname-ecommerce-backend`

### MinIO Connection Issues

1. **Verify endpoint is correct:**
   ```bash
   curl https://your-minio-app.fly.dev/minio/health/live
   ```

2. **Check SSL settings:**
   - Use `MINIO_USE_SSL="true"` for HTTPS
   - Use `MINIO_PORT="443"` for HTTPS

3. **Verify credentials** match Fly.io secrets

## Quick Reference

### Local Frontend + Deployed Backend

```bash
# apps/frontend/.env.local
NEXT_PUBLIC_API_URL="https://yourname-ecommerce-backend.fly.dev"
```

### Local Backend + Fly.io Database

```bash
# apps/backend/.env.local
DATABASE_URL="postgresql://user:password@yourname-ecommerce-db.fly.dev:5432/database?sslmode=require"
```

### Local Everything + Fly.io Database

```bash
# Start local services
docker compose up minio postgres -d  # Or just minio if using Fly.io DB

# Use Fly.io database
DATABASE_URL="postgresql://user:password@yourname-ecommerce-db.fly.dev:5432/database?sslmode=require"
```

## Best Practices

1. **Never commit `.env.local`** - It's in `.gitignore`
2. **Use different JWT secrets** for local and production
3. **Test database migrations locally** before deploying
4. **Use SSH tunnel or WireGuard** for production database access
5. **Keep Fly.io secrets updated** when changing configuration

---

**Need Help?** Check the main [Fly.io Deployment Guide](FLY_IO_DEPLOYMENT.md) or [Fly.io Documentation](https://fly.io/docs).

