# Quick Start: Fly.io Deployment

## 🚀 5-Minute Setup

### 1. Install Fly CLI
```bash
curl -L https://fly.io/install.sh | sh
fly auth login
```

### 2. Create Apps
```bash
# Backend
cd apps/backend
fly launch --no-deploy
# Choose app name: yourname-ecommerce-backend
# Choose region: iad (or your preference)

# Frontend
cd ../frontend
fly launch --no-deploy
# Choose app name: yourname-ecommerce-frontend
# Same region as backend
```

### 3. Set Up Database
```bash
fly postgres create --name yourname-ecommerce-db
fly postgres attach --app yourname-ecommerce-backend yourname-ecommerce-db
```

### 4. Set Secrets
```bash
# Backend
cd apps/backend
fly secrets set JWT_SECRET="$(openssl rand -base64 32)" --app yourname-ecommerce-backend
fly secrets set FRONTEND_URL="https://yourname-ecommerce-frontend.fly.dev" --app yourname-ecommerce-backend

# Frontend
cd ../frontend
fly secrets set NEXT_PUBLIC_API_URL="https://yourname-ecommerce-backend.fly.dev" --app yourname-ecommerce-frontend
fly secrets set NEXT_PUBLIC_APP_URL="https://yourname-ecommerce-frontend.fly.dev" --app yourname-ecommerce-frontend
```

### 5. Set GitHub Secret
```bash
# Get token
fly auth token

# Add to GitHub: Settings → Secrets → Actions → New secret
# Name: FLY_API_TOKEN
# Value: <paste token>
```

### 6. Deploy
```bash
# Manual first deploy
cd apps/backend && fly deploy
cd apps/frontend && fly deploy

# Or push to main for auto-deploy
git push origin main
```

## ✅ Done!

Your app is now:
- ✅ Deployed to Fly.io
- ✅ Auto-deploys on merge to main
- ✅ Running tests and linters in CI

## 📚 Next Steps

- [Full Deployment Guide](docs/FLY_IO_DEPLOYMENT.md)
- [Local Dev Setup](docs/LOCAL_DEV_FLYIO.md)
- [Deployment Summary](docs/DEPLOYMENT_SETUP_SUMMARY.md)

