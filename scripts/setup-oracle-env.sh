#!/bin/bash
# Setup script for Oracle Cloud environment
# Creates .env file from template

set -e

echo "🚀 Setting up Oracle Cloud environment"
echo "======================================"
echo ""

# Check if .env already exists
if [ -f ".env" ]; then
    echo "⚠️  .env already exists. Backup created as .env.backup"
    cp .env .env.backup
fi

# Copy template
if [ -f "docs/env-templates/.env.example" ]; then
    cp docs/env-templates/.env.example .env
    echo "✅ Created .env from template"
else
    echo "❌ Template not found at docs/env-templates/.env.example"
    exit 1
fi

# Get Oracle VM IP
read -p "Enter your Oracle VM IP address: " VM_IP

if [ -z "$VM_IP" ]; then
    echo "⚠️  No IP provided, using placeholder"
    VM_IP="YOUR_SERVER_IP"
fi

# Replace placeholders
sed -i.bak "s/YOUR_SERVER_IP/$VM_IP/g" .env
rm .env.bak 2>/dev/null || true

# Generate JWT secret
JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || echo "CHANGE_THIS_TO_A_VERY_SECURE_RANDOM_STRING")
sed -i.bak "s/CHANGE_THIS_TO_A_VERY_SECURE_RANDOM_STRING/$JWT_SECRET/g" .env
rm .env.bak 2>/dev/null || true

echo ""
echo "✅ Environment file created!"
echo ""
echo "⚠️  IMPORTANT: Edit .env and set secure passwords for:"
echo "   - POSTGRES_PASSWORD"
echo "   - MINIO_ROOT_PASSWORD"
echo ""
echo "Next steps:"
echo "1. Edit .env: nano .env"
echo "2. Set secure passwords"
echo "3. Deploy: docker-compose up -d --build"
echo ""
echo "📚 See docs/ORACLE_CLOUD_DEPLOYMENT.md for full guide"

