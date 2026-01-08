# Local Build Quick Start

Quick reference for building and running locally.

## 🚀 One-Command Build

```bash
./scripts/build-local.sh
```

This will:
1. Setup environment files
2. Ask for build mode (development or production)
3. Build and start all services

## 📋 Manual Build Options

### Development Build (Hot Reload)

```bash
# Setup environment
./scripts/setup-local-env.sh

# Start with hot reload
docker compose -f docker compose.yml -f docker compose.dev.yml up
```

### Production Build

```bash
# Create .env
cp docs/env-templates/.env.example .env
# Edit .env

# Build and start
docker compose up --build -d
```

## 🛠️ Using Makefile

```bash
# Setup
make setup

# Development
make dev

# Production
make prod

# View logs
make logs

# Stop
make down

# Clean everything
make clean
```

## 📊 Access Services

Once built and running:

- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:3000/api
- **Swagger Docs**: http://localhost:3000/api/docs
- **MinIO Console**: http://localhost:9001 (admin/minioadmin)

## 🔧 Common Commands

```bash
# Check status
docker compose ps

# View logs
docker compose logs -f

# Restart service
docker compose restart backend

# Rebuild specific service
docker compose build backend
docker compose up -d backend
```

## 📚 Full Documentation

- [Local Build Guide](docs/LOCAL_BUILD_GUIDE.md) - Complete guide
- [Local Development](docs/LOCAL_DEVELOPMENT.md) - Development setup
- [Environment Setups](docs/ENVIRONMENT_SETUPS.md) - All scenarios

---

**Happy Building! 🚀**

