-- Document box folder tree (parentId)

ALTER TABLE "document_categories" ADD COLUMN IF NOT EXISTS "parentId" TEXT;

CREATE INDEX IF NOT EXISTS "document_categories_parentId_sortOrder_idx"
  ON "document_categories"("parentId", "sortOrder");

DO $$ BEGIN
  ALTER TABLE "document_categories"
    ADD CONSTRAINT "document_categories_parentId_fkey"
    FOREIGN KEY ("parentId") REFERENCES "document_categories"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
