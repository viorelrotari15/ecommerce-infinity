-- AlterTable: add default address columns to users (schema had them; migration was missing)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "defaultShippingAddress" JSONB;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "defaultBillingAddress" JSONB;
