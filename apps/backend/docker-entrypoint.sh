#!/bin/bash
set -e

echo "📦 Installing dependencies..."
npm install

echo "🔧 Generating Prisma Client..."
npx prisma generate

echo "🗄️  Syncing database schema..."
# For development: use db push to sync schema (no migrations needed)
# This is perfect for Docker development
npx prisma db push --skip-generate --accept-data-loss || {
  echo "⚠️  Schema sync failed, trying migrations..."
  # Fallback to migrations if db push fails
  npx prisma migrate deploy 2>/dev/null || npx prisma migrate dev --name init --skip-seed --skip-generate || true
}

echo "🌱 Seeding database..."
npx ts-node -r tsconfig-paths/register prisma/seed.ts || echo "⚠️  Seed failed or already seeded, continuing..."

echo "🚀 Starting NestJS..."
exec npm run start:dev

