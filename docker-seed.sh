#!/bin/bash

echo "🐳 Running migrations and seeding in Docker..."
echo "=================================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if backend container is running
echo -e "${YELLOW}🔍 Checking if backend container is running...${NC}"
if ! docker compose ps | grep -q "ecommerce-backend.*Up"; then
    echo -e "${RED}❌ Backend container is not running. Starting services...${NC}"
    docker compose up -d backend postgres minio
    echo "⏳ Waiting for services to be ready..."
    sleep 10
fi

# Wait for PostgreSQL to be ready
echo -e "${YELLOW}⏳ Waiting for PostgreSQL to be ready...${NC}"
until docker compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; do
    echo "   Waiting for PostgreSQL..."
    sleep 2
done
echo -e "${GREEN}✅ PostgreSQL is ready${NC}"

# Wait for MinIO to be ready
echo -e "${YELLOW}⏳ Waiting for MinIO to be ready...${NC}"
until curl -s http://localhost:9000/minio/health/live > /dev/null 2>&1; do
    echo "   Waiting for MinIO..."
    sleep 2
done
echo -e "${GREEN}✅ MinIO is ready${NC}"

echo ""

# Step 1: Run migration
echo -e "${YELLOW}📋 Step 1: Running database migration...${NC}"
docker compose exec -T backend npx prisma migrate dev --name add_product_images

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Migration failed!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Migration completed${NC}"
echo ""

# Step 2: Generate Prisma client
echo -e "${YELLOW}📦 Step 2: Generating Prisma client...${NC}"
docker compose exec -T backend npx prisma generate

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Prisma generate failed!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Prisma client generated${NC}"
echo ""

# Step 3: Seed products
echo -e "${YELLOW}🌱 Step 3: Seeding database with products...${NC}"
docker compose exec -T backend npm run prisma:seed

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Product seeding failed!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Products seeded${NC}"
echo ""

# Step 4: Seed images
echo -e "${YELLOW}🖼️  Step 4: Seeding product images...${NC}"
docker compose exec -T backend npm run prisma:seed:images

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Image seeding failed!${NC}"
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
echo "🔍 Verify results:"
echo "  - Check products: curl http://localhost:3001/api/products | jq '.data[0].productImages'"
echo "  - Check MinIO: http://localhost:9001 (minioadmin/minioadmin)"
echo ""




