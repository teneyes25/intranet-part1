-- Document category FK: allow SetNull on delete
ALTER TABLE "shared_documents" DROP CONSTRAINT IF EXISTS "shared_documents_documentCategoryId_fkey";
ALTER TABLE "shared_documents"
  ADD CONSTRAINT "shared_documents_documentCategoryId_fkey"
  FOREIGN KEY ("documentCategoryId") REFERENCES "document_categories"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "approval_documents" DROP CONSTRAINT IF EXISTS "approval_documents_documentCategoryId_fkey";
ALTER TABLE "approval_documents"
  ADD CONSTRAINT "approval_documents_documentCategoryId_fkey"
  FOREIGN KEY ("documentCategoryId") REFERENCES "document_categories"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Leave / annual leave
DO $$ BEGIN
  CREATE TYPE "LeaveRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "NotificationType" ADD VALUE 'LEAVE_REQUEST';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "NotificationType" ADD VALUE 'LEAVE_RESULT';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "leave_balances" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "accruedDays" DOUBLE PRECISION NOT NULL DEFAULT 15,
    "usedDays" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "leave_balances_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "leave_balances_userId_year_key" ON "leave_balances"("userId", "year");
CREATE INDEX IF NOT EXISTS "leave_balances_year_idx" ON "leave_balances"("year");

DO $$ BEGIN
  ALTER TABLE "leave_balances"
    ADD CONSTRAINT "leave_balances_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "leave_requests" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "days" DOUBLE PRECISION NOT NULL,
    "reason" TEXT,
    "status" "LeaveRequestStatus" NOT NULL DEFAULT 'PENDING',
    "approverId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "leave_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "leave_requests_userId_status_idx" ON "leave_requests"("userId", "status");
CREATE INDEX IF NOT EXISTS "leave_requests_status_createdAt_idx" ON "leave_requests"("status", "createdAt");

DO $$ BEGIN
  ALTER TABLE "leave_requests"
    ADD CONSTRAINT "leave_requests_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "leave_requests"
    ADD CONSTRAINT "leave_requests_approverId_fkey"
    FOREIGN KEY ("approverId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "leave_month_end_mail_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "email" TEXT NOT NULL,
    "remaining" DOUBLE PRECISION NOT NULL,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "leave_month_end_mail_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "leave_month_end_mail_logs_userId_year_month_key"
  ON "leave_month_end_mail_logs"("userId", "year", "month");
CREATE INDEX IF NOT EXISTS "leave_month_end_mail_logs_year_month_idx"
  ON "leave_month_end_mail_logs"("year", "month");
