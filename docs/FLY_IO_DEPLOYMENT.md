# Fly.io Deployment Guide

This guide will help you deploy your e-commerce application to Fly.io with automated deployments from GitHub.

## Prerequisites

1. **Fly.io Account**: Sign up at [fly.io](https://fly.io)
2. **Fly CLI**: Install the Fly CLI
   ```bash
   curl -L https://fly.io/install.sh | sh
   ```
3. **GitHub Repository**: Your code should be in a GitHub repository
4. **PostgreSQL Database**: You'll need a PostgreSQL database (Fly.io Postgres or external)

## Initial Setup

### 1. Install Fly CLI and Login

```bash
# Install Fly CLI (if not already installed)
curl -L https://fly.io/install.sh | sh

# Login to Fly.io
fly auth login
```

### 2. Create Fly.io Apps

You need to create two separate apps on Fly.io - one for backend and one for frontend.

#### Create Backend App

```bash
cd apps/backend
fly launch --no-deploy
```

When prompted:
- **App name**: Choose a unique name (e.g., `yourname-ecommerce-backend`)
- **Region**: Choose your preferred region (e.g., `iad` for Washington D.C.)
- **PostgreSQL**: You can create one here or use an existing database
- **Redis**: Not needed for now

#### Create Frontend App

```bash
cd apps/frontend
fly launch --no-deploy
```

When prompted:
- **App name**: Choose a unique name (e.g., `yourname-ecommerce-frontend`)
- **Region**: Use the same region as backend
- **PostgreSQL**: Not needed for frontend
- **Redis**: Not needed

### 3. Set Up PostgreSQL Database

#### Option A: Use Fly.io Postgres (Recommended)

```bash
# Create a Postgres database
fly postgres create --name yourname-ecommerce-db

# Attach it to your backend app
fly postgres attach --app yourname-ecommerce-backend yourname-ecommerce-db
```

This will automatically set the `DATABASE_URL` secret in your backend app.

#### Option B: Use External Database

If you're using an external PostgreSQL database (like Supabase, Railway, etc.), set the connection string:

```bash
fly secrets set DATABASE_URL="postgresql://user:password@host:port/database" --app yourname-ecommerce-backend
```

### 4. Configure Environment Variables

#### Backend Secrets

Set all required environment variables for the backend:

```bash
cd apps/backend

# Database (if not using Fly Postgres attach)
fly secrets set DATABASE_URL="postgresql://..." --app yourname-ecommerce-backend

# JWT Configuration
fly secrets set JWT_SECRET="your-super-secret-jwt-key-change-in-production" --app yourname-ecommerce-backend
fly secrets set JWT_EXPIRES_IN="7d" --app yourname-ecommerce-backend

# MinIO/Object Storage Configuration
fly secrets set MINIO_ENDPOINT="your-minio-endpoint" --app yourname-ecommerce-backend
fly secrets set MINIO_PORT="9000" --app yourname-ecommerce-backend
fly secrets set MINIO_USE_SSL="true" --app yourname-ecommerce-backend
fly secrets set MINIO_ACCESS_KEY="your-access-key" --app yourname-ecommerce-backend
fly secrets set MINIO_SECRET_KEY="your-secret-key" --app yourname-ecommerce-backend
fly secrets set MINIO_BUCKET="products" --app yourname-ecommerce-backend
fly secrets set MINIO_PUBLIC_URL="https://your-cdn-url.com" --app yourname-ecommerce-backend

# CORS Configuration
fly secrets set FRONTEND_URL="https://yourname-ecommerce-frontend.fly.dev" --app yourname-ecommerce-backend

# Port (usually not needed, but can be set)
fly secrets set PORT="3001" --app yourname-ecommerce-backend
```

#### Frontend Secrets

Set environment variables for the frontend:

```bash
cd apps/frontend

# API URL (pointing to your backend)
fly secrets set NEXT_PUBLIC_API_URL="https://yourname-ecommerce-backend.fly.dev" --app yourname-ecommerce-frontend

# App URL
fly secrets set NEXT_PUBLIC_APP_URL="https://yourname-ecommerce-frontend.fly.dev" --app yourname-ecommerce-frontend

# CDN URL (if using external CDN for images)
fly secrets set NEXT_PUBLIC_CDN_URL="https://your-cdn-url.com" --app yourname-ecommerce-frontend
```

**Note**: In Next.js, only variables prefixed with `NEXT_PUBLIC_` are exposed to the browser. Other variables should be set as secrets but won't be accessible in client-side code.

### 5. Update Fly.io Configuration

Edit the `fly.toml` files to match your app names:

#### `apps/backend/fly.toml`

```toml
app = "yourname-ecommerce-backend"  # Update this
primary_region = "iad"  # Update to your region
```

#### `apps/frontend/fly.toml`

```toml
app = "yourname-ecommerce-frontend"  # Update this
primary_region = "iad"  # Update to your region
```

### 6. Set Up GitHub Secrets

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Add the following secret:
   - **Name**: `FLY_API_TOKEN`
   - **Value**: Get it by running `fly auth token` in your terminal

### 7. Initial Deployment

#### Manual Deployment (First Time)

Deploy both apps manually the first time:

```bash
# Deploy backend
cd apps/backend
fly deploy

# Deploy frontend
cd apps/frontend
fly deploy
```

#### Verify Deployment

- Backend: `https://yourname-ecommerce-backend.fly.dev/api/health`
- Frontend: `https://yourname-ecommerce-frontend.fly.dev`
- API Docs: `https://yourname-ecommerce-backend.fly.dev/api/docs`

## Automated Deployments

Once set up, the GitHub Actions workflow will automatically deploy on every push to `main` or `master` branch.

### Workflow Files

- `.github/workflows/deploy.yml`: Deploys to Fly.io on push to main/master
- `.github/workflows/ci.yml`: Runs linting and builds on every push/PR

### Manual Deployment Trigger

You can also trigger deployments manually from GitHub:
1. Go to **Actions** tab
2. Select **Deploy to Fly.io** workflow
3. Click **Run workflow**

## Database Migrations

Migrations run automatically on deployment via the `docker-entrypoint.prod.sh` script. The script:
1. Generates Prisma Client
2. Runs `prisma migrate deploy` (production migrations)
3. Falls back to `prisma db push` if migrations fail

### Manual Migration

If you need to run migrations manually:

```bash
fly ssh console --app yourname-ecommerce-backend
cd /app
npx prisma migrate deploy
```

## Monitoring and Logs

### View Logs

```bash
# Backend logs
fly logs --app yourname-ecommerce-backend

# Frontend logs
fly logs --app yourname-ecommerce-frontend

# Follow logs in real-time
fly logs --app yourname-ecommerce-backend -f
```

### Check App Status

```bash
fly status --app yourname-ecommerce-backend
fly status --app yourname-ecommerce-frontend
```

### SSH into Container

```bash
fly ssh console --app yourname-ecommerce-backend
```

## Scaling

### Scale Up Resources

```bash
# Scale backend (more CPU/memory)
fly scale vm shared-cpu-2x --memory 1024 --app yourname-ecommerce-backend

# Scale frontend
fly scale vm shared-cpu-2x --memory 1024 --app yourname-ecommerce-frontend
```

### Scale Out (Multiple Instances)

```bash
# Run multiple backend instances
fly scale count 2 --app yourname-ecommerce-backend

# Run multiple frontend instances
fly scale count 2 --app yourname-ecommerce-frontend
```

## Custom Domains

### Add Custom Domain

```bash
# Add domain to backend
fly certs add api.yourdomain.com --app yourname-ecommerce-backend

# Add domain to frontend
fly certs add yourdomain.com --app yourname-ecommerce-frontend
```

### Update DNS

Follow the instructions provided by Fly.io to update your DNS records.

## Troubleshooting

### Deployment Fails

1. **Check logs**: `fly logs --app yourname-ecommerce-backend`
2. **Verify secrets**: `fly secrets list --app yourname-ecommerce-backend`
3. **Check database connection**: Ensure `DATABASE_URL` is correct
4. **Verify Dockerfile**: Ensure `Dockerfile.prod` exists and is correct

### Database Connection Issues

1. Verify `DATABASE_URL` is set correctly
2. Check if database is accessible from Fly.io region
3. For Fly Postgres, ensure it's attached: `fly postgres list`

### Build Failures

1. Check GitHub Actions logs
2. Verify all dependencies are in `package.json`
3. Ensure Node.js version matches (20.x)

### Health Check Failing

The health check endpoint is at `/api/health`. Verify it's accessible:
```bash
curl https://yourname-ecommerce-backend.fly.dev/api/health
```

## Environment-Specific Configuration

### Development vs Production

- **Development**: Uses `docker-compose.yml` with local services
- **Production**: Uses Fly.io with production Dockerfiles (`Dockerfile.prod`)

### Environment Variables

- **Secrets**: Use `fly secrets set` for sensitive data
- **Public Variables**: Can be set in `fly.toml` under `[env]` section

## Cost Optimization

### Auto-Stop Machines

Both apps are configured with `auto_stop_machines = true` and `auto_start_machines = true`, which means:
- Machines stop after 5 minutes of inactivity
- Machines automatically start when receiving traffic
- You only pay for active usage

### Resource Sizing

Default configuration:
- **CPU**: 1 shared CPU
- **Memory**: 512 MB

Adjust based on your needs:
```bash
fly scale vm shared-cpu-1x --memory 256 --app yourname-ecommerce-backend  # Smaller
fly scale vm shared-cpu-2x --memory 1024 --app yourname-ecommerce-backend  # Larger
```

## Security Best Practices

1. **Never commit secrets**: Use Fly.io secrets
2. **Use strong JWT secrets**: Generate with `openssl rand -base64 32`
3. **Enable HTTPS**: Fly.io provides free SSL certificates
4. **Set CORS properly**: Only allow your frontend domain
5. **Database security**: Use connection pooling and SSL for database connections

## Next Steps

1. ✅ Set up monitoring (consider Fly.io's built-in monitoring or external services)
2. ✅ Configure backups for your database
3. ✅ Set up error tracking (Sentry, etc.)
4. ✅ Configure CDN for static assets
5. ✅ Set up staging environment (optional)

## Support

- [Fly.io Documentation](https://fly.io/docs)
- [Fly.io Community](https://community.fly.io)
- [GitHub Issues](https://github.com/your-repo/issues)

---

**Happy Deploying! 🚀**

