-- Sprint #2: Approval amount, SharedDocument dealer, RAG scope columns

ALTER TABLE "approval_documents" ADD COLUMN IF NOT EXISTS "amount" INTEGER;

ALTER TABLE "shared_documents" ADD COLUMN IF NOT EXISTS "dealerId" TEXT;

ALTER TABLE "document_chunks" ADD COLUMN IF NOT EXISTS "dealer_id" TEXT;
ALTER TABLE "document_chunks" ADD COLUMN IF NOT EXISTS "min_role" TEXT;

CREATE INDEX IF NOT EXISTS "document_chunks_dealer_id_idx" ON "document_chunks" ("dealer_id");
