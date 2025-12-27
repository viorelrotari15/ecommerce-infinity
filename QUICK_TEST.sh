#!/bin/bash

echo "🚀 Quick Test Script for MinIO Image Storage"
echo "=============================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if services are running
echo "📋 Checking services..."
if docker compose ps | grep -q "ecommerce-backend.*Up"; then
    echo -e "${GREEN}✅ Backend is running${NC}"
else
    echo -e "${RED}❌ Backend is not running. Start with: docker compose up -d${NC}"
    exit 1
fi

if docker compose ps | grep -q "ecommerce-minio.*Up"; then
    echo -e "${GREEN}✅ MinIO is running${NC}"
else
    echo -e "${RED}❌ MinIO is not running. Start with: docker compose up -d${NC}"
    exit 1
fi

# Test MinIO health
echo ""
echo "🏥 Testing MinIO health..."
MINIO_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:9000/minio/health/live)
if [ "$MINIO_HEALTH" = "200" ]; then
    echo -e "${GREEN}✅ MinIO is healthy${NC}"
else
    echo -e "${RED}❌ MinIO health check failed (HTTP $MINIO_HEALTH)${NC}"
fi

# Test backend API
echo ""
echo "🔌 Testing backend API..."
API_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/products)
if [ "$API_HEALTH" = "200" ]; then
    echo -e "${GREEN}✅ Backend API is responding${NC}"
else
    echo -e "${RED}❌ Backend API check failed (HTTP $API_HEALTH)${NC}"
fi

# Test frontend
echo ""
echo "🌐 Testing frontend..."
FRONTEND_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000)
if [ "$FRONTEND_HEALTH" = "200" ]; then
    echo -e "${GREEN}✅ Frontend is responding${NC}"
else
    echo -e "${RED}❌ Frontend check failed (HTTP $FRONTEND_HEALTH)${NC}"
fi

echo ""
echo "=============================================="
echo -e "${YELLOW}📝 Next Steps:${NC}"
echo "1. Run database migration: cd apps/backend && npx prisma migrate dev --name add_product_images"
echo "2. Login at http://localhost:3000/auth/login (admin@example.com / admin123)"
echo "3. Create product at http://localhost:3000/admin/products/new"
echo "4. Upload images and verify"
echo ""
echo "For detailed testing, see: TESTING_GUIDE.md"
