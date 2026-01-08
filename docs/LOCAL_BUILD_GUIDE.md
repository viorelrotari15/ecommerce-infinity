# Local Build Guide

Complete guide for building and running the application locally in all development modes.

## 🚀 Quick Start - Fully Local Build

### Option 1: Docker Compose (Recommended)

**Development Mode (Hot Reload):**
```bash
# Setup environment
./scripts/setup-local-env.sh

# Start all services with hot reload
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

**Production Mode (Optimized Build):**
```bash
# Create .env file for local
cp docs/env-templates/.env.example .env
# Edit .env with local values (see below)

# Build and start
docker-compose up --build
```

### Option 2: Local Development (No Docker for Apps)

**Start Infrastructure Only:**
```bash
# Start database and MinIO
docker-compose up postgres minio -d

# Then run backend and frontend locally (see below)
```

## 📋 Environment Configuration for Local Builds

### Create Root `.env` File

For Docker Compose, create `.env` in project root:

```bash
# .env (project root)
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=ecommerce
POSTGRES_PORT=5432

DATABASE_URL=postgresql://postgres:postgres@postgres:5432/ecommerce

JWT_SECRET=local-dev-jwt-secret
JWT_EXPIRES_IN=7d

MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin
MINIO_PORT=9000
MINIO_CONSOLE_PORT=9001
MINIO_BUCKET=products
MINIO_ENDPOINT=minio
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_PUBLIC_URL=http://localhost:9000

BACKEND_PORT=3000
FRONTEND_PORT=3001
NODE_ENV=development

FRONTEND_URL=http://localhost:3001
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3001
NEXT_PUBLIC_CDN_URL=http://localhost:9000
```

### Backend `.env.local` (For Local Development)

Create `apps/backend/.env.local`:

```bash
# For Docker Compose (use service names)
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/ecommerce
MINIO_ENDPOINT=minio
MINIO_PORT=9000

# For Local Development (use localhost)
# DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ecommerce
# MINIO_ENDPOINT=localhost
# MINIO_PORT=9000

JWT_SECRET=local-dev-jwt-secret
JWT_EXPIRES_IN=7d
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=products
MINIO_PUBLIC_URL=http://localhost:9000
FRONTEND_URL=http://localhost:3001
PORT=3000
NODE_ENV=development
```

### Frontend `.env.local` (For Local Development)

Create `apps/frontend/.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3001
NEXT_PUBLIC_CDN_URL=http://localhost:9000
```

## 🔨 Build Commands

### Docker Compose Builds

**Development Build (Hot Reload):**
```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

**Production Build:**
```bash
docker-compose up --build -d
```

**Rebuild Specific Service:**
```bash
docker-compose build backend
docker-compose build frontend
```

**Clean Build (No Cache):**
```bash
docker-compose build --no-cache
docker-compose up -d
```

### Local Builds (No Docker)

**Backend:**
```bash
cd apps/backend
npm install
npx prisma generate
npm run build
npm run start:prod
```

**Frontend:**
```bash
cd apps/frontend
npm install
npm run build
npm run start
```

## 🎯 Build Scenarios

### Scenario 1: Fully Local with Docker Compose

**Development Mode:**
```bash
# 1. Setup
./scripts/setup-local-env.sh

# 2. Start with hot reload
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

**Production Mode:**
```bash
# 1. Create .env
cp docs/env-templates/.env.example .env
# Edit .env with local values

# 2. Build and start
docker-compose up --build -d
```

**Access:**
- Frontend: http://localhost:3001
- Backend: http://localhost:3000
- Swagger: http://localhost:3000/api/docs
- MinIO: http://localhost:9001

### Scenario 2: Local Apps + Docker Infrastructure

**Start Infrastructure:**
```bash
docker-compose up postgres minio -d
```

**Backend (Terminal 1):**
```bash
cd apps/backend
npm install
npx prisma generate
npx prisma migrate dev
npm run prisma:seed
npm run start:dev
```

**Frontend (Terminal 2):**
```bash
cd apps/frontend
npm install
npm run dev
```

### Scenario 3: Fully Local (No Docker)

**Prerequisites:**
- PostgreSQL installed locally
- MinIO installed locally (or use Docker for MinIO only)

**Backend:**
```bash
cd apps/backend
npm install
npx prisma generate
npx prisma migrate dev
npm run prisma:seed
npm run start:dev
```

**Frontend:**
```bash
cd apps/frontend
npm install
npm run dev
```

## 🛠️ Build Scripts

### Quick Build Script

Create `scripts/build-local.sh`:

```bash
#!/bin/bash
set -e

echo "🔨 Building local environment..."

# Setup environment
./scripts/setup-local-env.sh

# Build and start
echo "🚀 Starting services..."
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

### Production Build Script

Create `scripts/build-prod-local.sh`:

```bash
#!/bin/bash
set -e

echo "🔨 Building production local environment..."

# Check .env exists
if [ ! -f ".env" ]; then
    echo "⚠️  .env not found. Creating from template..."
    cp docs/env-templates/.env.example .env
    echo "📝 Please edit .env with your local values"
    exit 1
fi

# Build and start
echo "🚀 Building and starting services..."
docker-compose up --build -d

echo "✅ Services started!"
echo "📊 Check status: docker-compose ps"
echo "📋 View logs: docker-compose logs -f"
```

## 📊 Build Verification

### Check Build Status

```bash
# Docker Compose
docker-compose ps

# Check logs
docker-compose logs -f

# Check specific service
docker-compose logs backend
docker-compose logs frontend
```

### Test Endpoints

```bash
# Backend health
curl http://localhost:3000/api/health

# Frontend
curl http://localhost:3001

# Swagger
curl http://localhost:3000/api/docs
```

### Database Connection

```bash
# Via Docker
docker-compose exec postgres psql -U postgres -d ecommerce

# From host (if port exposed)
psql -h localhost -p 5432 -U postgres -d ecommerce
```

## 🔧 Troubleshooting Builds

### Build Fails

```bash
# Clean everything
docker-compose down -v
docker system prune -a

# Rebuild
docker-compose build --no-cache
```

### Port Conflicts

```bash
# Check what's using ports
lsof -i :3000
lsof -i :3001
lsof -i :9000

# Change ports in .env
BACKEND_PORT=3002
FRONTEND_PORT=3003
```

### Database Connection Issues

```bash
# Check database is running
docker-compose ps postgres

# Check connection string
echo $DATABASE_URL

# Test connection
docker-compose exec backend npx prisma db pull
```

### Frontend Build Errors

```bash
# Clear Next.js cache
rm -rf apps/frontend/.next
rm -rf apps/frontend/node_modules

# Rebuild
cd apps/frontend
npm install
npm run build
```

## 📚 Related Documentation

- [Local Development Guide](LOCAL_DEVELOPMENT.md) - Complete local setup
- [Environment Setups](ENVIRONMENT_SETUPS.md) - All configuration scenarios
- [Oracle Cloud Deployment](ORACLE_CLOUD_DEPLOYMENT.md) - Production deployment

---

**Happy Building! 🚀**

