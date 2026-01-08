#!/bin/bash
# Setup script for fully local development environment
# This creates .env.local files for backend and frontend

set -e

echo "🚀 Setting up fully local development environment"
echo "=================================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Backend setup
echo -e "${YELLOW}📝 Setting up backend environment...${NC}"

if [ -f "apps/backend/.env.local" ]; then
    echo "⚠️  apps/backend/.env.local already exists. Skipping..."
else
    cat > apps/backend/.env.local << 'EOF'
# Backend Environment - Fully Local Setup
DATABASE_URL="postgresql://postgres:postgres@postgres:5432/ecommerce"
JWT_SECRET="local-dev-jwt-secret-change-in-production"
JWT_EXPIRES_IN="7d"
MINIO_ENDPOINT="minio"
MINIO_PORT="9000"
MINIO_USE_SSL="false"
MINIO_ACCESS_KEY="minioadmin"
MINIO_SECRET_KEY="minioadmin"
MINIO_BUCKET="products"
MINIO_PUBLIC_URL="http://localhost:9000"
FRONTEND_URL="http://localhost:3001"
PORT="3000"
NODE_ENV="development"
EOF
    echo -e "${GREEN}✅ Created apps/backend/.env.local${NC}"
fi

# Frontend setup
echo -e "${YELLOW}📝 Setting up frontend environment...${NC}"

if [ -f "apps/frontend/.env.local" ]; then
    echo "⚠️  apps/frontend/.env.local already exists. Skipping..."
else
    cat > apps/frontend/.env.local << 'EOF'
# Frontend Environment - Fully Local Setup
NEXT_PUBLIC_API_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3001"
NEXT_PUBLIC_CDN_URL="http://localhost:9000"
EOF
    echo -e "${GREEN}✅ Created apps/frontend/.env.local${NC}"
fi

echo ""
echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Start services with Docker Compose (Development with hot reload):"
echo "   docker compose -f docker compose.yml -f docker compose.dev.yml up"
echo ""
echo "2. Or start production build:"
echo "   docker compose up --build -d"
echo ""
echo "3. Or run services locally (no Docker for apps):"
echo "   # Terminal 1: Database & MinIO"
echo "   docker compose up postgres minio -d"
echo ""
echo "   # Terminal 2: Backend"
echo "   cd apps/backend && npm install && npm run start:dev"
echo ""
echo "   # Terminal 3: Frontend"
echo "   cd apps/frontend && npm install && npm run dev"
echo ""
echo "🌐 Access URLs:"
echo "   Frontend: http://localhost:3001"
echo "   Backend: http://localhost:3000"
echo "   Swagger: http://localhost:3000/api/docs"
echo "   MinIO: http://localhost:9001"
echo ""
echo "📚 See docs/LOCAL_BUILD_GUIDE.md for complete build guide"

