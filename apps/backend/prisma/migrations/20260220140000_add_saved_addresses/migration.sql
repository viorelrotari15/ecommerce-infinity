-- AlterTable
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "savedAddresses" JSONB;
