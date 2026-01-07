# Quick Start: Fully Local Development

Run everything locally - frontend, backend, database, and MinIO - all on your machine.

## 🚀 3-Step Setup

### Step 1: Setup Environment Files

```bash
./scripts/setup-local-env.sh
```

This creates `.env.local` files for backend and frontend with local configuration.

### Step 2: Start Services

**Option A: Docker Compose (Easiest)**
```bash
docker compose up
```

**Option B: Run Locally (No Docker)**
```bash
# Terminal 1: Database (Docker)
docker compose up postgres minio -d

# Terminal 2: Backend
cd apps/backend
npm install
npx prisma generate
npx prisma migrate dev
npm run prisma:seed
npm run start:dev

# Terminal 3: Frontend
cd apps/frontend
npm install
npm run dev
```

### Step 3: Access Your App

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **API Docs**: http://localhost:3001/api/docs
- **MinIO Console**: http://localhost:9001 (admin/minioadmin)

## ✅ Done!

You now have:
- ✅ Frontend running locally
- ✅ Backend running locally
- ✅ Database running locally
- ✅ MinIO running locally
- ✅ Hot reload enabled
- ✅ All services connected

## 📚 Next Steps

- [Full Local Development Guide](docs/LOCAL_DEVELOPMENT.md)
- [Environment Setups](docs/ENVIRONMENT_SETUPS.md) - See all configuration options
- [Switch to Fly.io Services](docs/LOCAL_DEV_FLYIO.md) - Use Fly.io database/backend

## 🔄 Switching Setups

Want to use Fly.io services instead? See [ENVIRONMENT_SETUPS.md](docs/ENVIRONMENT_SETUPS.md) for:
- Local Frontend + Local Backend + Fly.io Database
- Local Frontend + Deployed Backend
- Fully Deployed

---

**Happy Coding! 🚀**

