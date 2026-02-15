-- Add missing columns to orders table (guest checkout, region, shipping method, tracking).
-- Safe to run on DBs where orders was created by the initial migration (no guestEmail etc).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'guestEmail') THEN
    ALTER TABLE "orders" ADD COLUMN "guestEmail" TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'regionId') THEN
    ALTER TABLE "orders" ADD COLUMN "regionId" TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'shippingMethodId') THEN
    ALTER TABLE "orders" ADD COLUMN "shippingMethodId" TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'trackingNumber') THEN
    ALTER TABLE "orders" ADD COLUMN "trackingNumber" TEXT;
  END IF;
END $$;

DO $$
BEGIN
  IF (SELECT is_nullable FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'userId') = 'NO' THEN
    ALTER TABLE "orders" ALTER COLUMN "userId" DROP NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_regionId_fkey') AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'regions') THEN
    ALTER TABLE "orders" ADD CONSTRAINT "orders_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "regions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_shippingMethodId_fkey') AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'shipping_methods') THEN
    ALTER TABLE "orders" ADD CONSTRAINT "orders_shippingMethodId_fkey" FOREIGN KEY ("shippingMethodId") REFERENCES "shipping_methods"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
