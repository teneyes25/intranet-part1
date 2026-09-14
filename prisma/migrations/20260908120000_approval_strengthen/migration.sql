-- CreateEnum
CREATE TYPE "ApprovalKind" AS ENUM ('GENERAL', 'BUDGET', 'LEAVE', 'EXTERNAL_OFFICIAL', 'INTERNAL_OFFICIAL', 'INTAKE');

-- CreateEnum
CREATE TYPE "ApprovalStepRole" AS ENUM ('HANDLER', 'REVIEWER', 'APPROVER', 'COOPERATE', 'PROXY');

-- AlterTable
ALTER TABLE "approval_documents" ADD COLUMN IF NOT EXISTS "kind" "ApprovalKind" NOT NULL DEFAULT 'GENERAL';
ALTER TABLE "approval_documents" ADD COLUMN IF NOT EXISTS "executedAt" TIMESTAMP(3);
ALTER TABLE "approval_documents" ADD COLUMN IF NOT EXISTS "executedById" TEXT;
ALTER TABLE "approval_documents" ADD COLUMN IF NOT EXISTS "sealStorageKey" TEXT;
ALTER TABLE "approval_documents" ADD COLUMN IF NOT EXISTS "signatureStorageKey" TEXT;

-- AlterTable
ALTER TABLE "approval_steps" ADD COLUMN IF NOT EXISTS "role" "ApprovalStepRole" NOT NULL DEFAULT 'APPROVER';

-- AlterTable
ALTER TABLE "document_categories" ADD COLUMN IF NOT EXISTS "retentionYears" INTEGER;
ALTER TABLE "document_categories" ADD COLUMN IF NOT EXISTS "isPublic" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE IF NOT EXISTS "approval_attachments" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approval_attachments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "approval_attachments_documentId_idx" ON "approval_attachments"("documentId");
CREATE INDEX IF NOT EXISTS "approval_documents_executedById_idx" ON "approval_documents"("executedById");

DO $$ BEGIN
  ALTER TABLE "approval_documents" ADD CONSTRAINT "approval_documents_executedById_fkey"
    FOREIGN KEY ("executedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "approval_attachments" ADD CONSTRAINT "approval_attachments_documentId_fkey"
    FOREIGN KEY ("documentId") REFERENCES "approval_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
