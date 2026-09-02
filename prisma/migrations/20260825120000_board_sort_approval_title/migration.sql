-- Board sidebar/admin order
ALTER TABLE "boards" ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER NOT NULL DEFAULT 0;

UPDATE "boards" SET "sortOrder" = CASE "key"
  WHEN 'notices' THEN 10
  WHEN 'schedule' THEN 20
  WHEN 'regulations' THEN 30
  WHEN 'general' THEN 40
  WHEN 'news' THEN 50
  WHEN 'pr' THEN 60
  WHEN 'products' THEN 70
  ELSE "sortOrder"
END
WHERE "sortOrder" = 0;

CREATE INDEX IF NOT EXISTS "boards_sortOrder_idx" ON "boards"("sortOrder");

-- Approval stamp lane job title (이사 / 대표이사 등)
ALTER TABLE "approval_steps" ADD COLUMN IF NOT EXISTS "title" TEXT;
