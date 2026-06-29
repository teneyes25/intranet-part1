-- Phase 2: 멀티테넌트 레이아웃 + 게시판 범용 slug

ALTER TABLE "page_layouts" ADD COLUMN IF NOT EXISTS "dealerId" TEXT NOT NULL DEFAULT 'global';

UPDATE "page_layouts" SET "dealerId" = 'global';

DROP INDEX IF EXISTS "page_layouts_slug_key";

CREATE UNIQUE INDEX IF NOT EXISTS "page_layouts_slug_dealerId_key" ON "page_layouts"("slug", "dealerId");
CREATE INDEX IF NOT EXISTS "page_layouts_dealerId_idx" ON "page_layouts"("dealerId");
