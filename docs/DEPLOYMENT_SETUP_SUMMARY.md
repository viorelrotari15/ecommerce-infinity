# Deployment Setup Summary

This document summarizes the complete Fly.io deployment setup with GitHub Actions CI/CD.

## ✅ What's Configured

### 1. Fly.io Configuration
- ✅ `apps/backend/fly.toml` - Backend Fly.io configuration
- ✅ `apps/frontend/fly.toml` - Frontend Fly.io configuration
- ✅ Production Dockerfiles (`Dockerfile.prod`) for both apps
- ✅ Health check endpoint (`/api/health`)

### 2. GitHub Actions CI/CD
- ✅ **Deploy Workflow** (`.github/workflows/deploy.yml`)
  - Triggers on push to `main`/`master`
  - Triggers on PR merge to `main`/`master`
  - Deploys backend first, then frontend
  - Uses Fly.io API token from secrets

- ✅ **CI Workflow** (`.github/workflows/ci.yml`)
  - Runs on every push and PR
  - Lints backend and frontend
  - Builds both applications
  - Runs tests (with `--passWithNoTests` for empty test suites)

### 3. Testing Setup
- ✅ Backend: Jest configured (existing)
- ✅ Frontend: Jest + React Testing Library configured
- ✅ Example test files created
- ✅ Tests run in CI pipeline

### 4. Local Development Support
- ✅ CORS updated to support multiple origins
- ✅ Documentation for connecting to Fly.io services
- ✅ Environment variable examples

## 🚀 Quick Start

### Initial Deployment

1. **Install Fly CLI and Login**
   ```bash
   curl -L https://fly.io/install.sh | sh
   fly auth login
   ```

2. **Create Apps**
   ```bash
   cd apps/backend
   fly launch --no-deploy
   
   cd ../frontend
   fly launch --no-deploy
   ```

3. **Set Up Database**
   ```bash
   fly postgres create --name yourname-ecommerce-db
   fly postgres attach --app yourname-ecommerce-backend yourname-ecommerce-db
   ```

4. **Set Secrets** (see [FLY_IO_DEPLOYMENT.md](FLY_IO_DEPLOYMENT.md))

5. **Set GitHub Secret**
   - Go to GitHub repo → Settings → Secrets → Actions
   - Add `FLY_API_TOKEN` (get with `fly auth token`)

6. **Deploy**
   ```bash
   # Manual first deployment
   cd apps/backend && fly deploy
   cd apps/frontend && fly deploy
   
   # Or push to main to trigger auto-deployment
   ```

## 📋 Deployment Triggers

Deployments happen automatically when:
- ✅ You push directly to `main` or `master` branch
- ✅ You merge a PR into `main` or `master` branch
- ✅ You manually trigger from GitHub Actions UI

## 🧪 Testing

### Run Tests Locally

**Backend:**
```bash
cd apps/backend
npm test
npm run test:watch
npm run test:cov
```

**Frontend:**
```bash
cd apps/frontend
npm test
npm run test:watch
npm run test:coverage
```

### Tests in CI

- Tests run automatically on every push/PR
- Backend tests: `npm test -- --coverage --passWithNoTests`
- Frontend tests: `npm test -- --passWithNoTests`
- Builds must pass before deployment

## 🔧 Local Development Scenarios

### Scenario 1: Local Frontend → Deployed Backend

1. Create `apps/frontend/.env.local`:
   ```bash
   NEXT_PUBLIC_API_URL="https://yourname-ecommerce-backend.fly.dev"
   ```

2. Update backend CORS to allow localhost:
   ```bash
   fly secrets set FRONTEND_URL="https://yourname-ecommerce-frontend.fly.dev,http://localhost:3000" --app yourname-ecommerce-backend
   ```

3. Run frontend locally:
   ```bash
   cd apps/frontend
   npm run dev
   ```

### Scenario 2: Local Everything → Fly.io Database

1. Create `apps/backend/.env.local`:
   ```bash
   DATABASE_URL="postgresql://user:password@yourname-ecommerce-db.fly.dev:5432/database?sslmode=require"
   ```

2. Run locally:
   ```bash
   cd apps/backend
   npm run start:dev
   ```

See [LOCAL_DEV_FLYIO.md](LOCAL_DEV_FLYIO.md) for complete guide.

## 📁 File Structure

```
.
├── .github/
│   └── workflows/
│       ├── deploy.yml          # Auto-deployment workflow
│       └── ci.yml               # CI workflow (lint, build, test)
├── apps/
│   ├── backend/
│   │   ├── fly.toml            # Fly.io backend config
│   │   ├── Dockerfile.prod     # Production Dockerfile
│   │   ├── docker-entrypoint.prod.sh
│   │   └── src/
│   │       ├── health/         # Health check endpoint
│   │       └── *.spec.ts       # Test files
│   └── frontend/
│       ├── fly.toml            # Fly.io frontend config
│       ├── Dockerfile.prod     # Production Dockerfile
│       ├── jest.config.js      # Jest configuration
│       ├── jest.setup.js       # Jest setup
│       └── src/
│           └── __tests__/      # Test files
└── docs/
    ├── FLY_IO_DEPLOYMENT.md    # Full deployment guide
    └── LOCAL_DEV_FLYIO.md      # Local dev with Fly.io guide
```

## 🔐 Required Secrets

### Fly.io Secrets (Backend)
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - JWT signing secret
- `JWT_EXPIRES_IN` - Token expiration (e.g., "7d")
- `MINIO_ENDPOINT` - MinIO endpoint
- `MINIO_ACCESS_KEY` - MinIO access key
- `MINIO_SECRET_KEY` - MinIO secret key
- `FRONTEND_URL` - Allowed frontend URLs (comma-separated)

### Fly.io Secrets (Frontend)
- `NEXT_PUBLIC_API_URL` - Backend API URL
- `NEXT_PUBLIC_APP_URL` - Frontend URL
- `NEXT_PUBLIC_CDN_URL` - CDN URL for images

### GitHub Secrets
- `FLY_API_TOKEN` - Fly.io API token (get with `fly auth token`)

## 📚 Documentation

### Development
- **[LOCAL_DEVELOPMENT.md](LOCAL_DEVELOPMENT.md)** - Fully local setup (everything on your machine)
- **[ENVIRONMENT_SETUPS.md](ENVIRONMENT_SETUPS.md)** - All configuration scenarios
- **[LOCAL_DEV_FLYIO.md](LOCAL_DEV_FLYIO.md)** - Hybrid setups with Fly.io services

### Deployment
- **[FLY_IO_DEPLOYMENT.md](FLY_IO_DEPLOYMENT.md)** - Complete deployment guide

## 🐛 Troubleshooting

### Deployment Fails
1. Check GitHub Actions logs
2. Verify `FLY_API_TOKEN` secret is set
3. Check Fly.io app names match `fly.toml`
4. Verify all required secrets are set

### Tests Fail
1. Run tests locally first
2. Check test files are in correct locations
3. Backend: `src/**/*.spec.ts`
4. Frontend: `src/**/*.test.{ts,tsx}` or `src/__tests__/**/*`

### CORS Issues
1. Update `FRONTEND_URL` secret with comma-separated URLs
2. Restart backend: `fly apps restart yourname-ecommerce-backend`

## ✨ Next Steps

1. ✅ Set up Fly.io apps
2. ✅ Configure secrets
3. ✅ Set GitHub `FLY_API_TOKEN`
4. ✅ Write your first tests
5. ✅ Push to main and watch it deploy!

---

**Happy Deploying! 🚀**

