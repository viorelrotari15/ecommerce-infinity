#!/bin/bash

echo "🚀 Running migrations and seeding database with images..."
echo "=================================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if services are running
echo -e "${YELLOW}🔍 Checking if services are running...${NC}"
if ! docker compose ps | grep -q "ecommerce-postgres.*Up"; then
    echo -e "${RED}❌ PostgreSQL is not running. Starting services...${NC}"
    docker compose up -d postgres
    echo "⏳ Waiting for PostgreSQL to be ready..."
    sleep 5
fi

if ! docker compose ps | grep -q "ecommerce-minio.*Up"; then
    echo -e "${RED}❌ MinIO is not running. Starting services...${NC}"
    docker compose up -d minio
    echo "⏳ Waiting for MinIO to be ready..."
    sleep 5
fi

# Load environment variables from .env if it exists
if [ -f ".env" ]; then
    set -a
    source .env
    set +a
fi

# Set default database URL if not set (for local execution)
if [ -z "$DATABASE_URL" ]; then
    DB_USER=${DB_USER:-postgres}
    DB_PASSWORD=${DB_PASSWORD:-postgres}
    DB_HOST=${DB_HOST:-localhost}
    DB_PORT=${DB_PORT:-5433}
    DB_NAME=${DB_NAME:-ecommerce}
    export DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
    echo "📝 Using DATABASE_URL: postgresql://${DB_USER}:***@${DB_HOST}:${DB_PORT}/${DB_NAME}"
fi

# Set MinIO defaults if not set
export MINIO_ENDPOINT=${MINIO_ENDPOINT:-localhost}
export MINIO_PORT=${MINIO_PORT:-9000}
export MINIO_USE_SSL=${MINIO_USE_SSL:-false}
export MINIO_ACCESS_KEY=${MINIO_ACCESS_KEY:-minioadmin}
export MINIO_SECRET_KEY=${MINIO_SECRET_KEY:-minioadmin}
export MINIO_BUCKET=${MINIO_BUCKET:-products}

cd apps/backend

# Step 1: Run migration
echo -e "${YELLOW}📋 Step 1: Running database migration...${NC}"
npx prisma migrate dev --name add_product_images

if [ $? -ne 0 ]; then
    echo "❌ Migration failed!"
    exit 1
fi

echo -e "${GREEN}✅ Migration completed${NC}"
echo ""

# Step 2: Generate Prisma client
echo -e "${YELLOW}📦 Step 2: Generating Prisma client...${NC}"
npx prisma generate

if [ $? -ne 0 ]; then
    echo "❌ Prisma generate failed!"
    exit 1
fi

echo -e "${GREEN}✅ Prisma client generated${NC}"
echo ""

# Step 3: Run main seed
echo -e "${YELLOW}🌱 Step 3: Seeding database with products...${NC}"
npm run prisma:seed

if [ $? -ne 0 ]; then
    echo "❌ Seed failed!"
    exit 1
fi

echo -e "${GREEN}✅ Products seeded${NC}"
echo ""

# Step 4: Seed images
echo -e "${YELLOW}🖼️  Step 4: Seeding product images...${NC}"

# Check if MinIO is accessible
MINIO_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:9000/minio/health/live 2>/dev/null)

if [ "$MINIO_HEALTH" != "200" ]; then
    echo "⚠️  Warning: MinIO might not be running. Starting services..."
    cd ../..
    docker compose up -d minio
    echo "⏳ Waiting for MinIO to be ready..."
    sleep 5
    cd apps/backend
fi

# Run image seed script
# Load environment variables from docker-compose or .env
if [ -f "../../.env" ]; then
    export $(cat ../../.env | grep -v '^#' | xargs)
fi

npm run prisma:seed:images

if [ $? -ne 0 ]; then
    echo "❌ Image seeding failed!"
    exit 1
fi

echo -e "${GREEN}✅ Images seeded${NC}"
echo ""

echo "=================================================="
echo -e "${GREEN}✅ All done!${NC}"
echo ""
echo "📝 Summary:"
echo "  - Database migration: ✅"
echo "  - Products seeded: ✅"
echo "  - Images seeded: ✅"
echo ""
echo "🌐 Access your application:"
echo "  - Frontend: http://localhost:3000"
echo "  - Backend API: http://localhost:3001"
echo "  - MinIO Console: http://localhost:9001"
echo ""

