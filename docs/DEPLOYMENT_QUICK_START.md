# Deployment Quick Start

Quick reference for deploying to Oracle Cloud.

## 🚀 5-Minute Oracle Cloud Setup

### 1. Create VM and Configure Firewall

- Create Oracle VM (Always Free tier)
- Open ports: 22, 3000, 3001, 9000, 9001
- Connect via SSH

### 2. Install Docker

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
exit  # Log back in
```

### 3. Deploy Application

```bash
git clone https://github.com/yourusername/ecommerce-infinity.git
cd ecommerce-infinity
cp docs/env-templates/.env.example .env
nano .env  # Edit with your VM IP and passwords
docker-compose up -d --build
```

### 4. Access Services

- **Frontend**: http://YOUR_VM_IP:3001
- **Backend API**: http://YOUR_VM_IP:3000/api
- **Swagger**: http://YOUR_VM_IP:3000/api/docs
- **MinIO Console**: http://YOUR_VM_IP:9001

## 📋 Port Configuration

| Service | Port | URL Format |
|---------|------|------------|
| Backend | 3000 | `http://YOUR_IP:3000` |
| Swagger | 3000/api | `http://YOUR_IP:3000/api/docs` |
| Frontend | 3001 | `http://YOUR_IP:3001` |
| MinIO API | 9000 | `http://YOUR_IP:9000` |
| MinIO Console | 9001 | `http://YOUR_IP:9001` |

## 🔧 Common Commands

```bash
# View logs
docker-compose logs -f

# Restart services
docker-compose restart

# Update application
git pull && docker-compose down && docker-compose up -d --build

# Check status
docker-compose ps
```

## 📚 Full Documentation

See [ORACLE_CLOUD_DEPLOYMENT.md](ORACLE_CLOUD_DEPLOYMENT.md) for complete guide.

