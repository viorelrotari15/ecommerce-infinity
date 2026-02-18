-- Add product_types table and products.productTypeId if missing (backend 500 on /api/products).
-- Idempotent: safe to run multiple times.

-- 1) Create product_types table if not exists
CREATE TABLE IF NOT EXISTS "product_types" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "product_types_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "product_types_slug_key" ON "product_types"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "product_types_name_key" ON "product_types"("name");

-- 2) Insert default product type if none exists
INSERT INTO "product_types" ("id", "name", "slug", "description", "createdAt", "updatedAt")
SELECT 'a0000000-0000-0000-0000-000000000001', 'Default', 'default', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "product_types" LIMIT 1);

-- 3) Add productTypeId to products if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'productTypeId') THEN
    ALTER TABLE "products" ADD COLUMN "productTypeId" TEXT;
  END IF;
END $$;

-- 4) Backfill productTypeId with default type
UPDATE "products"
SET "productTypeId" = (SELECT "id" FROM "product_types" WHERE "slug" = 'default' LIMIT 1)
WHERE "productTypeId" IS NULL;

-- 5) Set NOT NULL once all rows have a value
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'productTypeId') THEN
    ALTER TABLE "products" ALTER COLUMN "productTypeId" SET NOT NULL;
  END IF;
EXCEPTION
  WHEN others THEN NULL;
END $$;

-- 6) Add foreign key if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_productTypeId_fkey') THEN
    ALTER TABLE "products" ADD CONSTRAINT "products_productTypeId_fkey" FOREIGN KEY ("productTypeId") REFERENCES "product_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
