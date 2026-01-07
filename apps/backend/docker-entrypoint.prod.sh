#!/bin/sh
set -e

echo "🔧 Generating Prisma Client..."
npx prisma generate

echo "🗄️  Running database migrations..."
npx prisma migrate deploy || {
  echo "⚠️  Migrations failed, trying db push..."
  npx prisma db push --skip-generate --accept-data-loss || true
}

echo "🚀 Starting NestJS in production mode..."
exec npm run start:prod
