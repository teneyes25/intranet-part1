-- Document box restructure: retention/classification, linked boards, managers

-- AlterTable document_categories
ALTER TABLE "document_categories" ADD COLUMN IF NOT EXISTS "retentionDays" INTEGER;
ALTER TABLE "document_categories" ADD COLUMN IF NOT EXISTS "classification" TEXT;
ALTER TABLE "document_categories" ADD COLUMN IF NOT EXISTS "classificationCode" TEXT;
ALTER TABLE "document_categories" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "document_categories" ADD COLUMN IF NOT EXISTS "boardId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "document_categories_boardId_key" ON "document_categories"("boardId");

DO $$ BEGIN
  ALTER TABLE "document_categories"
    ADD CONSTRAINT "document_categories_boardId_fkey"
    FOREIGN KEY ("boardId") REFERENCES "boards"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable document_box_managers
CREATE TABLE IF NOT EXISTS "document_box_managers" (
    "id" TEXT NOT NULL,
    "documentBoxId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "document_box_managers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "document_box_managers_documentBoxId_userId_key"
  ON "document_box_managers"("documentBoxId", "userId");
CREATE INDEX IF NOT EXISTS "document_box_managers_userId_idx" ON "document_box_managers"("userId");

DO $$ BEGIN
  ALTER TABLE "document_box_managers"
    ADD CONSTRAINT "document_box_managers_documentBoxId_fkey"
    FOREIGN KEY ("documentBoxId") REFERENCES "document_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "document_box_managers"
    ADD CONSTRAINT "document_box_managers_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable shared_documents
ALTER TABLE "shared_documents" ADD COLUMN IF NOT EXISTS "docType" TEXT;
CREATE INDEX IF NOT EXISTS "shared_documents_docType_idx" ON "shared_documents"("docType");
