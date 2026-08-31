-- Document category ownership + work type code
ALTER TABLE "document_categories" ADD COLUMN IF NOT EXISTS "workTypeCode" TEXT;
ALTER TABLE "document_categories" ADD COLUMN IF NOT EXISTS "ownerId" TEXT;

CREATE INDEX IF NOT EXISTS "document_categories_ownerId_idx" ON "document_categories"("ownerId");

DO $$ BEGIN
  ALTER TABLE "document_categories" ADD CONSTRAINT "document_categories_ownerId_fkey"
    FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Shared document number + dates
ALTER TABLE "shared_documents" ADD COLUMN IF NOT EXISTS "documentNumber" TEXT;
ALTER TABLE "shared_documents" ADD COLUMN IF NOT EXISTS "draftedAt" TIMESTAMP(3);
ALTER TABLE "shared_documents" ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3);
ALTER TABLE "shared_documents" ADD COLUMN IF NOT EXISTS "registeredAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "shared_documents_documentNumber_idx" ON "shared_documents"("documentNumber");

-- Approval document number + registeredAt
ALTER TABLE "approval_documents" ADD COLUMN IF NOT EXISTS "documentNumber" TEXT;
ALTER TABLE "approval_documents" ADD COLUMN IF NOT EXISTS "registeredAt" TIMESTAMP(3);
CREATE UNIQUE INDEX IF NOT EXISTS "approval_documents_documentNumber_key" ON "approval_documents"("documentNumber");

-- Document number sequence
CREATE TABLE IF NOT EXISTS "document_number_seqs" (
  "id" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "workType" TEXT NOT NULL,
  "monthDay" TEXT NOT NULL,
  "lastSeq" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "document_number_seqs_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "document_number_seqs_year_workType_monthDay_key"
  ON "document_number_seqs"("year", "workType", "monthDay");
