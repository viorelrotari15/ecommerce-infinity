# Environment Setup Guide

This guide covers all possible environment configurations for development and deployment.

## 🎯 Setup Scenarios

### Scenario 1: Fully Local (Everything on Your Machine) ⭐ Recommended for Development

**What runs locally:**
- ✅ Frontend (Next.js)
- ✅ Backend (NestJS)
- ✅ Database (PostgreSQL)
- ✅ MinIO (Object Storage)

**Best for:**
- Initial development
- Testing features
- Offline development
- Learning the codebase

**Setup:** See [LOCAL_DEVELOPMENT.md](LOCAL_DEVELOPMENT.md)

---

### Scenario 2: Local Frontend + Local Backend + Fly.io Database

**What runs where:**
- ✅ Frontend: Local
- ✅ Backend: Local
- ✅ Database: Fly.io
- ✅ MinIO: Local (or Fly.io)

**Best for:**
- Testing with production database
- Sharing database with team
- Database migrations testing

**Setup:**
1. Create `apps/backend/.env.local`:
   ```bash
   DATABASE_URL="postgresql://user:password@yourname-ecommerce-db.fly.dev:5432/database?sslmode=require"
   MINIO_ENDPOINT="localhost"
   MINIO_PORT="9000"
   FRONTEND_URL="http://localhost:3000"
   ```

2. Run locally:
   ```bash
   cd apps/backend && npm run start:dev
   cd apps/frontend && npm run dev
   ```

---

### Scenario 3: Local Frontend + Deployed Backend

**What runs where:**
- ✅ Frontend: Local
- ✅ Backend: Fly.io (deployed)
- ✅ Database: Fly.io
- ✅ MinIO: Fly.io

**Best for:**
- Frontend development with stable backend
- Testing frontend against production API
- Backend already deployed

**Setup:**
1. Create `apps/frontend/.env.local`:
   ```bash
   NEXT_PUBLIC_API_URL="https://yourname-ecommerce-backend.fly.dev"
   NEXT_PUBLIC_APP_URL="http://localhost:3000"
   NEXT_PUBLIC_CDN_URL="https://your-cdn-url.fly.dev"
   ```

2. Update backend CORS:
   ```bash
   fly secrets set FRONTEND_URL="https://yourname-ecommerce-frontend.fly.dev,http://localhost:3000" --app yourname-ecommerce-backend
   ```

3. Run frontend locally:
   ```bash
   cd apps/frontend && npm run dev
   ```

---

### Scenario 4: Fully Deployed (Production)

**What runs where:**
- ✅ Frontend: Fly.io
- ✅ Backend: Fly.io
- ✅ Database: Fly.io
- ✅ MinIO: Fly.io (or external CDN)

**Best for:**
- Production deployment
- Staging environment
- Demo/testing with real URLs

**Setup:** See [FLY_IO_DEPLOYMENT.md](FLY_IO_DEPLOYMENT.md)

---

## 📋 Quick Reference Table

| Component | Fully Local | Hybrid (DB Fly.io) | Hybrid (Backend Fly.io) | Fully Deployed |
|-----------|-------------|-------------------|------------------------|----------------|
| Frontend  | Local:3000  | Local:3000        | Local:3000             | Fly.io         |
| Backend   | Local:3001  | Local:3001        | Fly.io                 | Fly.io         |
| Database  | Local:5432  | Fly.io            | Fly.io                 | Fly.io         |
| MinIO     | Local:9000  | Local:9000        | Fly.io                 | Fly.io         |

## 🔄 Switching Between Setups

### From Fully Local to Hybrid (Fly.io DB)

1. **Get Fly.io database connection:**
   ```bash
   fly postgres connect --app yourname-ecommerce-db
   ```

2. **Update backend `.env.local`:**
   ```bash
   # Change this line:
   DATABASE_URL="postgresql://user:password@yourname-ecommerce-db.fly.dev:5432/database?sslmode=require"
   ```

3. **Restart backend:**
   ```bash
   # Stop current backend (Ctrl+C)
   cd apps/backend
   npm run start:dev
   ```

### From Hybrid to Fully Local

1. **Start local database:**
   ```bash
   docker compose up postgres -d
   ```

2. **Update backend `.env.local`:**
   ```bash
   DATABASE_URL="postgresql://postgres:postgres@localhost:5433/ecommerce"
   ```

3. **Run migrations:**
   ```bash
   cd apps/backend
   npx prisma migrate dev
   ```

4. **Restart backend**

### From Local Frontend to Deployed Backend

1. **Update frontend `.env.local`:**
   ```bash
   NEXT_PUBLIC_API_URL="https://yourname-ecommerce-backend.fly.dev"
   ```

2. **Update backend CORS:**
   ```bash
   fly secrets set FRONTEND_URL="https://yourname-ecommerce-frontend.fly.dev,http://localhost:3000" --app yourname-ecommerce-backend
   fly apps restart yourname-ecommerce-backend
   ```

3. **Restart frontend:**
   ```bash
   cd apps/frontend
   npm run dev
   ```

## 📁 Environment Files

### Project Root `.env`
Used by Docker Compose for container configuration.

```bash
DB_USER=postgres
DB_PASSWORD=postgres
DB_PORT=5433
JWT_SECRET=your-secret
```

### `apps/backend/.env.local`
Backend-specific environment variables.

```bash
DATABASE_URL=...
JWT_SECRET=...
MINIO_ENDPOINT=...
FRONTEND_URL=...
```

### `apps/frontend/.env.local`
Frontend-specific environment variables (only `NEXT_PUBLIC_*` are exposed to browser).

```bash
NEXT_PUBLIC_API_URL=...
NEXT_PUBLIC_APP_URL=...
NEXT_PUBLIC_CDN_URL=...
```

## 🔐 Security Notes

1. **Never commit `.env.local`** - These files are in `.gitignore`
2. **Use different secrets** for local vs production
3. **Rotate JWT secrets** regularly in production
4. **Use SSL** for Fly.io database connections (`?sslmode=require`)
5. **Limit CORS origins** in production

## 🐛 Common Issues

### "Cannot connect to database"
- Check if database is running
- Verify connection string format
- Check SSL requirements for Fly.io

### "CORS error"
- Verify `FRONTEND_URL` includes your frontend URL
- Check backend CORS configuration
- Restart backend after changing CORS settings

### "MinIO connection failed"
- Verify MinIO is running
- Check endpoint and port
- Verify credentials match

## 📚 Related Documentation

- [LOCAL_DEVELOPMENT.md](LOCAL_DEVELOPMENT.md) - Fully local setup
- [LOCAL_DEV_FLYIO.md](LOCAL_DEV_FLYIO.md) - Hybrid setups with Fly.io
- [FLY_IO_DEPLOYMENT.md](FLY_IO_DEPLOYMENT.md) - Production deployment
- [ENV_SETUP.md](ENV_SETUP.md) - Environment variable reference

---

**Choose the setup that fits your workflow! 🚀**

