-- AlterTable: add OAuth provider ids and make password optional (for OAuth-only users)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "googleId" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "facebookId" TEXT;
ALTER TABLE "users" ALTER COLUMN "password" DROP NOT NULL;

-- CreateIndex (unique so one provider id maps to one user)
CREATE UNIQUE INDEX IF NOT EXISTS "users_googleId_key" ON "users"("googleId");
CREATE UNIQUE INDEX IF NOT EXISTS "users_facebookId_key" ON "users"("facebookId");
