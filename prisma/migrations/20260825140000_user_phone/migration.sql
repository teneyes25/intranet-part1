-- AlterTable
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "users_phone_idx" ON "users"("phone");
