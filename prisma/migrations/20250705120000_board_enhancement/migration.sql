-- 게시판 기능 강화 1차: 아나바다 필드, 매장 locator
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "price" INTEGER;
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "saleStatus" TEXT;

ALTER TABLE "dealers" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE "dealers" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "dealers" ADD COLUMN IF NOT EXISTS "businessHours" TEXT;
ALTER TABLE "dealers" ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION;
ALTER TABLE "dealers" ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION;

CREATE INDEX IF NOT EXISTS "posts_saleStatus_idx" ON "posts"("saleStatus");
