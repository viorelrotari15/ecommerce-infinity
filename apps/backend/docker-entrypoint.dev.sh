#!/bin/sh
set -e

echo "📦 Installing dependencies..."
npm install

echo "🔧 Generating Prisma Client..."
npx prisma generate

echo "🗄️  Syncing database schema..."
# For development: use db push to sync schema (no migrations needed)
npx prisma db push --skip-generate --accept-data-loss || {
  echo "⚠️  Schema sync failed, trying migrations..."
  # Fallback to migrations if db push fails
  npx prisma migrate deploy 2>/dev/null || npx prisma migrate dev --name init --skip-seed --skip-generate || true
}

echo "🌱 Seeding database..."
npx ts-node -r tsconfig-paths/register prisma/seed.ts || echo "⚠️  Seed failed or already seeded, continuing..."

echo "🧹 Preparing dist directory..."
# Remove dist if it exists and recreate (avoid EBUSY error with volume mounts)
# This prevents the EBUSY error when NestJS tries to delete dist
if [ -d "dist" ]; then
  rm -rf dist/* 2>/dev/null || true
fi
mkdir -p dist

echo "🚀 Starting NestJS in development mode..."
# Start with watch mode - dist is now part of mounted volume so no EBUSY error
exec npm run start:dev

