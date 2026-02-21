-- Remove direct Google/Facebook OAuth columns; add avatarUrl for Firebase profile picture
ALTER TABLE "users" DROP COLUMN IF EXISTS "googleId";
ALTER TABLE "users" DROP COLUMN IF EXISTS "facebookId";
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT;

-- Drop old unique indexes if they exist (created by Prisma for googleId/facebookId)
DROP INDEX IF EXISTS "users_googleId_key";
DROP INDEX IF EXISTS "users_facebookId_key";
