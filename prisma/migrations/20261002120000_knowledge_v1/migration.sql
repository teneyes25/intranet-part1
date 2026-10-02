-- Knowledge v1 additive catalog + outbox. Existing tables are unchanged.

CREATE TABLE IF NOT EXISTS "knowledge_documents" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sourceSystem" TEXT NOT NULL DEFAULT 'intranet',
    "sourceId" TEXT,
    "attachmentId" TEXT,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "approvedVersionId" TEXT,
    "activeVersionId" TEXT,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "aclRevision" INTEGER NOT NULL DEFAULT 0,
    "aclAt" TIMESTAMPTZ,
    "processingStatus" TEXT NOT NULL DEFAULT 'PENDING_UPLOAD',
    "stateRevision" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "knowledge_documents_pkey" PRIMARY KEY ("tenantId", "id")
);

CREATE TABLE IF NOT EXISTS "knowledge_document_versions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "previewKey" TEXT,
    "attachmentId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'STORED',
    "chunks" JSONB,
    "indexGeneration" INTEGER NOT NULL DEFAULT 0,
    "indexedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "knowledge_document_versions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "knowledge_document_versions_doc_idx"
  ON "knowledge_document_versions" ("tenantId", "documentId");

CREATE TABLE IF NOT EXISTS "knowledge_document_acls" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "principalType" TEXT NOT NULL,
    "principalId" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "knowledge_document_acls_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "knowledge_document_acls_doc_rev_idx"
  ON "knowledge_document_acls" ("tenantId", "documentId", "revision");

CREATE TABLE IF NOT EXISTS "knowledge_sync_events" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "versionId" TEXT,
    "aclRevision" INTEGER,
    "fingerprint" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "knowledge_sync_events_pkey" PRIMARY KEY ("tenantId", "id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "knowledge_sync_events_seq_idx"
  ON "knowledge_sync_events" ("tenantId", "documentId", "sequence");

CREATE TABLE IF NOT EXISTS "knowledge_sync_jobs" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "versionId" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "nextRetryAt" TIMESTAMPTZ,
    "lastError" TEXT,
    "leaseOwner" TEXT,
    "leaseUntil" TIMESTAMPTZ,
    "completedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "knowledge_sync_jobs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "knowledge_sync_jobs_status_idx"
  ON "knowledge_sync_jobs" ("tenantId", "status", "nextRetryAt");

CREATE TABLE IF NOT EXISTS "knowledge_staff_groups" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "knowledge_staff_groups_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "knowledge_staff_groups_user_group_idx"
  ON "knowledge_staff_groups" ("tenantId", "userId", "groupId");

ALTER TABLE "knowledge_document_versions"
  ADD CONSTRAINT "knowledge_document_versions_doc_fkey"
  FOREIGN KEY ("tenantId", "documentId") REFERENCES "knowledge_documents"("tenantId", "id")
  ON DELETE CASCADE;

ALTER TABLE "knowledge_document_acls"
  ADD CONSTRAINT "knowledge_document_acls_doc_fkey"
  FOREIGN KEY ("tenantId", "documentId") REFERENCES "knowledge_documents"("tenantId", "id")
  ON DELETE CASCADE;

ALTER TABLE "knowledge_sync_events"
  ADD CONSTRAINT "knowledge_sync_events_doc_fkey"
  FOREIGN KEY ("tenantId", "documentId") REFERENCES "knowledge_documents"("tenantId", "id")
  ON DELETE CASCADE;

ALTER TABLE "knowledge_sync_jobs"
  ADD CONSTRAINT "knowledge_sync_jobs_doc_fkey"
  FOREIGN KEY ("tenantId", "documentId") REFERENCES "knowledge_documents"("tenantId", "id")
  ON DELETE CASCADE;
