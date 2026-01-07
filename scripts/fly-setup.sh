#!/bin/bash
# Quick setup script for Fly.io deployment
# Usage: ./scripts/fly-setup.sh

set -e

echo "🚀 Fly.io Setup Script"
echo "======================"
echo ""

# Check if fly CLI is installed
if ! command -v fly &> /dev/null; then
    echo "❌ Fly CLI is not installed."
    echo "Install it with: curl -L https://fly.io/install.sh | sh"
    exit 1
fi

echo "✅ Fly CLI is installed"
echo ""

# Check if logged in
if ! fly auth whoami &> /dev/null; then
    echo "⚠️  Not logged in to Fly.io"
    echo "Run: fly auth login"
    exit 1
fi

echo "✅ Logged in to Fly.io"
echo ""

# Get app names
read -p "Enter backend app name (e.g., yourname-ecommerce-backend): " BACKEND_APP
read -p "Enter frontend app name (e.g., yourname-ecommerce-frontend): " FRONTEND_APP
read -p "Enter region (e.g., iad): " REGION

# Update backend fly.toml
echo "📝 Updating backend fly.toml..."
sed -i.bak "s/app = \".*\"/app = \"$BACKEND_APP\"/" apps/backend/fly.toml
sed -i.bak "s/primary_region = \".*\"/primary_region = \"$REGION\"/" apps/backend/fly.toml
rm apps/backend/fly.toml.bak 2>/dev/null || true

# Update frontend fly.toml
echo "📝 Updating frontend fly.toml..."
sed -i.bak "s/app = \".*\"/app = \"$FRONTEND_APP\"/" apps/frontend/fly.toml
sed -i.bak "s/primary_region = \".*\"/primary_region = \"$REGION\"/" apps/frontend/fly.toml
rm apps/frontend/fly.toml.bak 2>/dev/null || true

echo ""
echo "✅ Configuration files updated!"
echo ""
echo "Next steps:"
echo "1. Create apps on Fly.io (if not already created):"
echo "   cd apps/backend && fly launch --no-deploy"
echo "   cd apps/frontend && fly launch --no-deploy"
echo ""
echo "2. Set up database:"
echo "   fly postgres create --name yourname-ecommerce-db"
echo "   fly postgres attach --app $BACKEND_APP yourname-ecommerce-db"
echo ""
echo "3. Set environment variables (see docs/FLY_IO_DEPLOYMENT.md)"
echo ""
echo "4. Deploy:"
echo "   cd apps/backend && fly deploy"
echo "   cd apps/frontend && fly deploy"
echo ""
echo "📚 Full documentation: docs/FLY_IO_DEPLOYMENT.md"

