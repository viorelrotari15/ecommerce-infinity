-- AlterTable
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "hiddenAddressKeys" JSONB;
