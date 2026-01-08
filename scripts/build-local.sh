#!/bin/bash
# Build script for local development environment
# Builds and starts all services locally

set -e

echo "🔨 Building Local Development Environment"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  .env not found. Creating from template...${NC}"
    if [ -f "docs/env-templates/.env.example" ]; then
        cp docs/env-templates/.env.example .env
        echo -e "${GREEN}✅ Created .env from template${NC}"
        echo -e "${YELLOW}📝 Please edit .env with your local values${NC}"
    else
        echo -e "${YELLOW}⚠️  Template not found. Creating basic .env...${NC}"
        cat > .env << 'EOF'
# Local Development Environment
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=ecommerce
POSTGRES_PORT=5432
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/ecommerce
JWT_SECRET=local-dev-jwt-secret-change-in-production
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
EOF
    fi
fi

# Setup local env files
echo -e "${BLUE}📝 Setting up local environment files...${NC}"
./scripts/setup-local-env.sh

# Ask for build mode
echo ""
echo -e "${YELLOW}Select build mode:${NC}"
echo "1) Development (hot reload) - Recommended"
echo "2) Production (optimized)"
read -p "Enter choice [1-2]: " choice

case $choice in
    1)
        echo ""
        echo -e "${GREEN}🚀 Starting development build with hot reload...${NC}"
        echo ""
        docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
        ;;
    2)
        echo ""
        echo -e "${GREEN}🚀 Starting production build...${NC}"
        echo ""
        docker compose up --build -d
        echo ""
        echo -e "${GREEN}✅ Services started in background!${NC}"
        echo ""
        echo "📊 Check status: docker compose ps"
        echo "📋 View logs: docker compose logs -f"
        echo ""
        echo "🌐 Access:"
        echo "   Frontend: http://localhost:3001"
        echo "   Backend: http://localhost:3000"
        echo "   Swagger: http://localhost:3000/api/docs"
        echo "   MinIO: http://localhost:9001"
        ;;
    *)
        echo -e "${YELLOW}Invalid choice. Using development mode...${NC}"
        docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
        ;;
esac

