-- News categories (admin-managed)
CREATE TABLE IF NOT EXISTS "news_categories" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "news_categories_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "news_categories_name_key" ON "news_categories"("name");

-- Job categories + user_jobs
CREATE TABLE IF NOT EXISTS "job_categories" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "job_categories_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "job_categories_name_key" ON "job_categories"("name");

CREATE TABLE IF NOT EXISTS "user_jobs" (
  "userId" TEXT NOT NULL,
  "jobCategoryId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_jobs_pkey" PRIMARY KEY ("userId","jobCategoryId")
);
CREATE INDEX IF NOT EXISTS "user_jobs_jobCategoryId_idx" ON "user_jobs"("jobCategoryId");

DO $$ BEGIN
  ALTER TABLE "user_jobs" ADD CONSTRAINT "user_jobs_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "user_jobs" ADD CONSTRAINT "user_jobs_jobCategoryId_fkey"
    FOREIGN KEY ("jobCategoryId") REFERENCES "job_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Leave type enum
DO $$ BEGIN
  CREATE TYPE "LeaveType" AS ENUM ('FULL', 'HALF');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "leave_balances" ADD COLUMN IF NOT EXISTS "accruedAt" TIMESTAMP(3);

ALTER TABLE "leave_requests" ADD COLUMN IF NOT EXISTS "leaveType" "LeaveType" NOT NULL DEFAULT 'FULL';
ALTER TABLE "leave_requests" ADD COLUMN IF NOT EXISTS "emergencyContact" TEXT;
ALTER TABLE "leave_requests" ADD COLUMN IF NOT EXISTS "approvalDocumentId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "leave_requests_approvalDocumentId_key"
  ON "leave_requests"("approvalDocumentId");

DO $$ BEGIN
  ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_approvalDocumentId_fkey"
    FOREIGN KEY ("approvalDocumentId") REFERENCES "approval_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
