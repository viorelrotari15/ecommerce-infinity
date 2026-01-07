# Oracle Cloud Deployment Guide

Complete guide for deploying the e-commerce application to Oracle Cloud Infrastructure (OCI) Always Free tier using Docker Compose.

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Oracle VM Setup](#oracle-vm-setup)
- [Application Deployment](#application-deployment)
- [Environment Configuration](#environment-configuration)
- [Accessing Services](#accessing-services)
- [CI/CD Setup](#cicd-setup)
- [Troubleshooting](#troubleshooting)

## Prerequisites

- Oracle Cloud account (Always Free tier eligible)
- SSH key pair
- GitHub repository with your code
- Basic knowledge of Docker and Linux

## Oracle VM Setup

### 1. Create Oracle VM Instance

1. Log in to [Oracle Cloud Console](https://cloud.oracle.com)
2. Navigate to **Compute** → **Instances**
3. Click **Create Instance**
4. Configure:
   - **Name**: `ecommerce-vm`
   - **Image**: Oracle Linux 8 or Ubuntu 22.04
   - **Shape**: VM.Standard.E2.1.Micro (Always Free)
   - **Networking**: Assign public IP
   - **SSH Keys**: Upload your public key
5. Click **Create**

### 2. Configure Security Rules

Allow inbound traffic on required ports:

1. Navigate to **Networking** → **Virtual Cloud Networks**
2. Select your VCN → **Security Lists**
3. Add Ingress Rules:

| Source | IP Protocol | Destination Port Range | Description |
|--------|-------------|----------------------|-------------|
| 0.0.0.0/0 | TCP | 22 | SSH |
| 0.0.0.0/0 | TCP | 3000 | Backend API |
| 0.0.0.0/0 | TCP | 3001 | Frontend |
| 0.0.0.0/0 | TCP | 9000 | MinIO API |
| 0.0.0.0/0 | TCP | 9001 | MinIO Console |

### 3. Connect to VM

```bash
ssh -i ~/.ssh/your-key ubuntu@YOUR_VM_IP
# or for Oracle Linux:
ssh -i ~/.ssh/your-key opc@YOUR_VM_IP
```

### 4. Install Docker and Docker Compose

**For Ubuntu:**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Log out and back in for group changes
exit
```

**For Oracle Linux:**
```bash
sudo yum update -y
sudo yum install docker-engine -y
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

exit
```

### 5. Install Git

```bash
# Ubuntu
sudo apt install git -y

# Oracle Linux
sudo yum install git -y
```

## Application Deployment

### 1. Clone Repository

```bash
cd ~
git clone https://github.com/yourusername/ecommerce-infinity.git
cd ecommerce-infinity
```

### 2. Configure Environment

Copy the environment template:

```bash
cp docs/env-templates/.env.example .env
```

Edit `.env` with your Oracle VM IP:

```bash
nano .env
```

**Required changes:**
- Replace `YOUR_SERVER_IP` with your Oracle VM public IP
- Set strong passwords for `POSTGRES_PASSWORD`, `JWT_SECRET`, `MINIO_ROOT_PASSWORD`
- Generate JWT secret: `openssl rand -base64 32`

**Example `.env` for Oracle Cloud:**
```bash
POSTGRES_PASSWORD=your_secure_password_here
JWT_SECRET=$(openssl rand -base64 32)
MINIO_ROOT_PASSWORD=your_minio_password_here
DATABASE_URL=postgresql://postgres:your_secure_password_here@postgres:5432/ecommerce
MINIO_PUBLIC_URL=http://YOUR_VM_IP:9000
FRONTEND_URL=http://YOUR_VM_IP:3001
NEXT_PUBLIC_API_URL=http://YOUR_VM_IP:3000
NEXT_PUBLIC_APP_URL=http://YOUR_VM_IP:3001
NEXT_PUBLIC_CDN_URL=http://YOUR_VM_IP:9000
```

### 3. Deploy Services

```bash
# Build and start all services
docker-compose up -d --build

# View logs
docker-compose logs -f

# Check status
docker-compose ps
```

### 4. Verify Deployment

```bash
# Check all containers are running
docker-compose ps

# Check backend health
curl http://localhost:3000/api/health

# Check frontend
curl http://localhost:3001
```

## Environment Configuration

### Environment Files

The project supports multiple environment configurations:

1. **`.env.local`** - Fully local development (everything on your machine)
2. **`.env.dev`** - Development on Oracle Cloud
3. **`.env.production`** - Production on Oracle Cloud
4. **`.env`** - Active environment (used by docker-compose)

### Switching Environments

```bash
# For development on Oracle
cp .env.dev .env

# For production on Oracle
cp .env.production .env

# Then restart services
docker-compose down
docker-compose up -d --build
```

### Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@postgres:5432/db` |
| `JWT_SECRET` | JWT signing secret | Generate with `openssl rand -base64 32` |
| `MINIO_PUBLIC_URL` | MinIO public access URL | `http://YOUR_IP:9000` |
| `FRONTEND_URL` | Allowed frontend URLs (CORS) | `http://YOUR_IP:3001` |
| `NEXT_PUBLIC_API_URL` | Backend API URL (browser) | `http://YOUR_IP:3000` |
| `NEXT_PUBLIC_APP_URL` | Frontend app URL | `http://YOUR_IP:3001` |
| `NEXT_PUBLIC_CDN_URL` | CDN URL for images | `http://YOUR_IP:9000` |

## Accessing Services

Once deployed, access services using your Oracle VM public IP:

### Frontend
```
http://YOUR_VM_IP:3001
```

### Backend API
```
http://YOUR_VM_IP:3000/api
```

### Swagger Documentation
```
http://YOUR_VM_IP:3000/api/docs
```

### MinIO Console
```
http://YOUR_VM_IP:9001
```
- Username: `minioadmin` (or `MINIO_ROOT_USER` from `.env`)
- Password: `MINIO_ROOT_PASSWORD` from `.env`

### MinIO API
```
http://YOUR_VM_IP:9000
```

## CI/CD Setup

### 1. Generate SSH Key for GitHub Actions

On your local machine:

```bash
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github_actions
```

### 2. Add Public Key to Oracle VM

```bash
# Copy public key
cat ~/.ssh/github_actions.pub

# On Oracle VM, add to authorized_keys
ssh ubuntu@YOUR_VM_IP
mkdir -p ~/.ssh
echo "YOUR_PUBLIC_KEY" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

### 3. Configure GitHub Secrets

Go to your GitHub repository → **Settings** → **Secrets and variables** → **Actions**

Add these secrets:

| Secret Name | Value | Description |
|------------|-------|-------------|
| `ORACLE_IP` | `YOUR_VM_IP` | Oracle VM public IP address |
| `ORACLE_USER` | `ubuntu` or `opc` | SSH username |
| `SSH_KEY` | Contents of `~/.ssh/github_actions` | Private SSH key |
| `SSH_PORT` | `22` | SSH port (optional, defaults to 22) |
| `PROJECT_PATH` | `~/ecommerce-infinity` | Project path on VM (optional) |

### 4. Test Deployment

Push to `main` branch:

```bash
git add .
git commit -m "Test deployment"
git push origin main
```

Check GitHub Actions tab for deployment status.

## Local Development Modes

### Mode 1: Fully Local

Everything runs on your machine:

```bash
# Use local environment
cp docs/env-templates/.env.example .env.local

# Start services
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

Access at:
- Frontend: http://localhost:3001
- Backend: http://localhost:3000
- MinIO: http://localhost:9000

### Mode 2: Local FE + Local BE + Remote DB + Remote MinIO

Use Oracle Cloud database and MinIO, run frontend/backend locally:

```bash
# Backend .env.local
DATABASE_URL=postgresql://user:pass@YOUR_VM_IP:5432/ecommerce
MINIO_ENDPOINT=YOUR_VM_IP
MINIO_PORT=9000
MINIO_USE_SSL=false

# Frontend .env.local
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### Mode 3: Local FE + Remote BE

Connect local frontend to deployed backend:

```bash
# Frontend .env.local
NEXT_PUBLIC_API_URL=http://YOUR_VM_IP:3000
```

Update backend CORS in `.env` on Oracle VM:
```bash
FRONTEND_URL=http://YOUR_VM_IP:3001,http://localhost:3001
```

### Mode 4: Everything Remote

All services on Oracle Cloud (production).

## Common Operations

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Restart Services

```bash
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart backend
```

### Update Application

```bash
# Pull latest code
git pull

# Rebuild and restart
docker-compose down
docker-compose up -d --build
```

### Database Management

```bash
# Access database
docker-compose exec postgres psql -U postgres -d ecommerce

# Run migrations manually
docker-compose exec backend npx prisma migrate deploy

# Backup database
docker-compose exec postgres pg_dump -U postgres ecommerce > backup.sql
```

### MinIO Management

```bash
# Access MinIO console
# Open browser: http://YOUR_VM_IP:9001

# Using MinIO client
docker-compose exec minio-setup mc ls myminio/
```

## Troubleshooting

### Containers Won't Start

```bash
# Check logs
docker-compose logs

# Check container status
docker-compose ps

# Verify environment variables
docker-compose config
```

### Database Connection Issues

```bash
# Check database is running
docker-compose ps postgres

# Test connection
docker-compose exec backend npx prisma db pull

# Check DATABASE_URL format
echo $DATABASE_URL
```

### CORS Errors

1. Verify `FRONTEND_URL` in `.env` includes your frontend URL
2. Restart backend: `docker-compose restart backend`
3. Check browser console for exact error

### Port Already in Use

```bash
# Check what's using the port
sudo netstat -tulpn | grep :3000

# Kill process or change port in .env
```

### Out of Memory

Oracle Always Free VMs have limited RAM. If you encounter OOM errors:

```bash
# Check memory usage
free -h

# Reduce Docker resources or upgrade VM
```

### SSL/HTTPS Setup (Optional)

For production, set up reverse proxy with Let's Encrypt:

```bash
# Install Nginx
sudo apt install nginx -y

# Configure SSL with Certbot
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d yourdomain.com
```

## Security Best Practices

1. **Change Default Passwords**: Always change default passwords in `.env`
2. **Use Strong Secrets**: Generate JWT secret with `openssl rand -base64 32`
3. **Restrict SSH**: Use key-based authentication only
4. **Firewall**: Only open necessary ports
5. **Regular Updates**: Keep system and Docker updated
6. **Backups**: Regularly backup database and MinIO data
7. **Monitor Logs**: Check logs regularly for suspicious activity

## Backup and Recovery

### Backup Database

```bash
docker-compose exec postgres pg_dump -U postgres ecommerce > backup_$(date +%Y%m%d).sql
```

### Backup MinIO Data

```bash
# MinIO data is in Docker volume
docker run --rm -v ecommerce-infinity_minio_data:/data -v $(pwd):/backup alpine tar czf /backup/minio_backup.tar.gz /data
```

### Restore Database

```bash
cat backup.sql | docker-compose exec -T postgres psql -U postgres -d ecommerce
```

## Performance Optimization

1. **Enable Docker BuildKit**: `export DOCKER_BUILDKIT=1`
2. **Use Multi-stage Builds**: Already implemented in Dockerfiles
3. **Database Indexing**: Ensure Prisma schema has proper indexes
4. **CDN for Images**: Consider using CloudFlare or similar
5. **Caching**: Next.js has built-in caching, ensure it's enabled

## Support

For issues or questions:
- Check logs: `docker-compose logs`
- Review environment variables
- Verify network connectivity
- Check Oracle Cloud console for VM status

---

**Happy Deploying! 🚀**

