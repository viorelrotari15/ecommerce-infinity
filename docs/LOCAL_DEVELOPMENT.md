# Fully Local Development Setup

This guide covers running everything locally - frontend, backend, database, and MinIO - all on your machine.

## 🚀 Quick Start (Docker Compose)

The easiest way to run everything locally:

```bash
# Start all services (database, backend, frontend, MinIO)
docker compose up
```

This will:
- ✅ Start PostgreSQL on port `5433`
- ✅ Start Backend API on port `3001`
- ✅ Start Frontend on port `3000`
- ✅ Start MinIO on port `9000` (console on `9001`)
- ✅ Run database migrations automatically
- ✅ Seed the database with demo data

**Access your app:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- API Docs: http://localhost:3001/api/docs
- MinIO Console: http://localhost:9001 (admin/minioadmin)

## 📋 Option 1: Docker Compose (Recommended)

### Prerequisites
- Docker and Docker Compose installed
- No additional setup needed!

### Start Services

```bash
# Start all services
docker compose up

# Or run in background
docker compose up -d

# View logs
docker compose logs -f

# Stop services
docker compose down

# Stop and remove volumes (clean database)
docker compose down -v
```

### Environment Variables (Optional)

Create a `.env` file in the project root for custom configuration:

```bash
# .env (project root)
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=ecommerce
DB_PORT=5433

JWT_SECRET=your-local-jwt-secret
JWT_EXPIRES_IN=7d

MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_PORT=9000
MINIO_CONSOLE_PORT=9001
```

## 📋 Option 2: Local Development (No Docker)

Run services directly on your machine without Docker.

### Prerequisites
- Node.js 20+
- PostgreSQL 16+ installed locally
- (Optional) MinIO installed locally, or use Docker just for MinIO

### Step 1: Start Database

**Option A: Use Docker for Database Only**
```bash
docker compose up postgres -d
```

**Option B: Install PostgreSQL Locally**
```bash
# macOS
brew install postgresql@16
brew services start postgresql@16

# Create database
createdb ecommerce
```

### Step 2: Start MinIO (Optional - can use Docker)

**Option A: Use Docker for MinIO Only**
```bash
docker compose up minio -d
```

**Option B: Install MinIO Locally**
```bash
# macOS
brew install minio/stable/minio

# Start MinIO
minio server ~/minio-data --console-address ":9001"
```

### Step 3: Configure Backend

Create `apps/backend/.env.local`:

```bash
# Database - Local PostgreSQL
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ecommerce"
# Or if using Docker postgres:
# DATABASE_URL="postgresql://postgres:postgres@localhost:5433/ecommerce"

# JWT
JWT_SECRET="your-local-jwt-secret"
JWT_EXPIRES_IN="7d"

# MinIO - Local
MINIO_ENDPOINT="localhost"
MINIO_PORT="9000"
MINIO_USE_SSL="false"
MINIO_ACCESS_KEY="minioadmin"
MINIO_SECRET_KEY="minioadmin"
MINIO_BUCKET="products"
MINIO_PUBLIC_URL="http://localhost:9000"

# CORS
FRONTEND_URL="http://localhost:3000"
PORT="3001"
```

### Step 4: Setup Backend Database

```bash
cd apps/backend

# Install dependencies
npm install

# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed database
npm run prisma:seed
```

### Step 5: Start Backend

```bash
cd apps/backend
npm run start:dev
```

Backend will be available at http://localhost:3001

### Step 6: Configure Frontend

Create `apps/frontend/.env.local`:

```bash
NEXT_PUBLIC_API_URL="http://localhost:3001"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_CDN_URL="http://localhost:9000"
```

### Step 7: Start Frontend

```bash
cd apps/frontend
npm install
npm run dev
```

Frontend will be available at http://localhost:3000

## 🔄 Switching Between Setups

### Fully Local (Everything Local)

**Backend `.env.local`:**
```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ecommerce"
MINIO_ENDPOINT="localhost"
MINIO_PORT="9000"
MINIO_USE_SSL="false"
FRONTEND_URL="http://localhost:3000"
```

**Frontend `.env.local`:**
```bash
NEXT_PUBLIC_API_URL="http://localhost:3001"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_CDN_URL="http://localhost:9000"
```

### Local Frontend + Local Backend + Fly.io Database

**Backend `.env.local`:**
```bash
DATABASE_URL="postgresql://user:password@yourname-ecommerce-db.fly.dev:5432/database?sslmode=require"
MINIO_ENDPOINT="localhost"  # Still local
MINIO_PORT="9000"
FRONTEND_URL="http://localhost:3000"
```

### Local Frontend + Deployed Backend

**Frontend `.env.local`:**
```bash
NEXT_PUBLIC_API_URL="https://yourname-ecommerce-backend.fly.dev"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_CDN_URL="https://your-cdn-url.fly.dev"
```

## 📁 Environment Files Structure

```
.
├── .env                    # Root level (for docker-compose)
├── apps/
│   ├── backend/
│   │   ├── .env           # Backend defaults
│   │   └── .env.local     # Local overrides (not in git)
│   └── frontend/
│       ├── .env           # Frontend defaults
│       └── .env.local     # Local overrides (not in git)
```

**Priority Order:**
1. `.env.local` (highest priority, not committed)
2. `.env.development` or `.env.production`
3. `.env`

## 🗄️ Database Management

### Access Database

**With Docker:**
```bash
# Connect via Docker
docker compose exec postgres psql -U postgres -d ecommerce

# Or from host (port 5433)
psql -h localhost -p 5433 -U postgres -d ecommerce
```

**Local PostgreSQL:**
```bash
psql -U postgres -d ecommerce
```

### Run Migrations

```bash
cd apps/backend

# Development (creates migration files)
npx prisma migrate dev

# Production (applies existing migrations)
npx prisma migrate deploy

# Reset database (⚠️ deletes all data)
npx prisma migrate reset
```

### Seed Database

```bash
cd apps/backend
npm run prisma:seed
```

## 🗂️ MinIO Management

### Access MinIO Console

- URL: http://localhost:9001
- Username: `minioadmin`
- Password: `minioadmin`

### Create Bucket Manually

```bash
# Using MinIO client (mc)
mc alias set local http://localhost:9000 minioadmin minioadmin
mc mb local/products
mc anonymous set public local/products
```

## 🐛 Troubleshooting

### Port Already in Use

If ports are already in use, change them in `.env`:

```bash
# Change database port
DB_PORT=5434

# Change backend port (update FRONTEND_URL too)
PORT=3002

# Change frontend port
# Update next.config.js or use: PORT=3001 npm run dev
```

### Database Connection Issues

1. **Check if PostgreSQL is running:**
   ```bash
   # Docker
   docker compose ps postgres
   
   # Local
   brew services list | grep postgresql
   ```

2. **Verify connection string:**
   ```bash
   # Test connection
   psql "postgresql://postgres:postgres@localhost:5432/ecommerce"
   ```

3. **Check Prisma connection:**
   ```bash
   cd apps/backend
   npx prisma db pull
   ```

### Backend Won't Start

1. **Check logs:**
   ```bash
   docker compose logs backend
   ```

2. **Verify environment variables:**
   ```bash
   cd apps/backend
   cat .env.local
   ```

3. **Regenerate Prisma Client:**
   ```bash
   npx prisma generate
   ```

### Frontend Can't Connect to Backend

1. **Verify backend is running:**
   ```bash
   curl http://localhost:3001/api/health
   ```

2. **Check CORS settings:**
   - Backend should allow `http://localhost:3000`
   - Check `FRONTEND_URL` in backend `.env.local`

3. **Verify API URL:**
   ```bash
   # In frontend .env.local
   NEXT_PUBLIC_API_URL="http://localhost:3001"
   ```

### MinIO Connection Issues

1. **Check if MinIO is running:**
   ```bash
   curl http://localhost:9000/minio/health/live
   ```

2. **Verify credentials:**
   - Default: `minioadmin` / `minioadmin`
   - Check `MINIO_ACCESS_KEY` and `MINIO_SECRET_KEY`

3. **Check bucket exists:**
   - Visit MinIO Console: http://localhost:9001
   - Verify `products` bucket exists and is public

## 📚 Related Documentation

- [Local Dev with Fly.io](LOCAL_DEV_FLYIO.md) - Hybrid setups with Fly.io services
- [Fly.io Deployment](FLY_IO_DEPLOYMENT.md) - Production deployment guide
- [Environment Setup](ENV_SETUP.md) - Environment variable reference

## 💡 Tips

1. **Use Docker Compose for easiest setup** - Everything works out of the box
2. **Use `.env.local` for local overrides** - Never commit this file
3. **Hot reload works** - Changes to code reflect immediately
4. **Database persists** - Data survives container restarts (Docker volumes)
5. **Reset everything** - `docker compose down -v` removes all data

---

**Happy Coding! 🚀**

