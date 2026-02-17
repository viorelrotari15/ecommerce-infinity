-- Add missing columns to orders table (guest checkout, region, shipping method, tracking).
-- Run this manually if production DB still has 500 on /api/orders (e.g. migrate deploy not run or failed).
-- Same logic as migration 20260215180000_add_orders_guest_email_and_region (idempotent).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'guestEmail') THEN
    ALTER TABLE "orders" ADD COLUMN "guestEmail" TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'regionId') THEN
    ALTER TABLE "orders" ADD COLUMN "regionId" TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'shippingMethodId') THEN
    ALTER TABLE "orders" ADD COLUMN "shippingMethodId" TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'trackingNumber') THEN
    ALTER TABLE "orders" ADD COLUMN "trackingNumber" TEXT;
  END IF;
END $$;

DO $$
DECLARE
  v_nullable text;
BEGIN
  SELECT is_nullable INTO v_nullable FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'userId';
  IF v_nullable = 'NO' THEN
    ALTER TABLE "orders" ALTER COLUMN "userId" DROP NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_regionId_fkey') AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'regions') THEN
    ALTER TABLE "orders" ADD CONSTRAINT "orders_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "regions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_shippingMethodId_fkey') AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'shipping_methods') THEN
    ALTER TABLE "orders" ADD CONSTRAINT "orders_shippingMethodId_fkey" FOREIGN KEY ("shippingMethodId") REFERENCES "shipping_methods"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
