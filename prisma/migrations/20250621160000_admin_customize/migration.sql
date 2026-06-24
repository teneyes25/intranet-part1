-- Admin customize center (Day 31 / Phase 5) — idempotent for production deploy

DO $$ BEGIN
  ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'SITE_CUSTOMIZE';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'AI_INGEST_RUN';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'APPROVAL_CUSTOMIZE';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'INTEGRATION_UPDATE';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "site_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "appName" TEXT NOT NULL DEFAULT 'Intranet',
    "logoStorageKey" TEXT,
    "faviconStorageKey" TEXT,
    "bannerStorageKey" TEXT,
    "bannerMediaType" TEXT,
    "primaryColor" TEXT NOT NULL DEFAULT '222.2 47.4% 11.2%',
    "sidebarColor" TEXT NOT NULL DEFAULT '222.2 47.4% 11.2%',
    "sidebarForeground" TEXT NOT NULL DEFAULT '210 40% 98%',
    "dashboardLayout" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedById" TEXT,
    CONSTRAINT "site_settings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ai_ingest_jobs" (
    "id" TEXT NOT NULL,
    "triggeredById" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "boardKeys" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL,
    "postsProcessed" INTEGER NOT NULL DEFAULT 0,
    "chunksTotal" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "ai_ingest_jobs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "approval_line_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "department" TEXT,
    "targetRole" "Role",
    "steps" JSONB NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "approval_line_templates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "integration_settings" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "apiKey" TEXT,
    "apiSecret" TEXT,
    "accessToken" TEXT,
    "webhookUrl" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "integration_settings_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ai_ingest_jobs_startedAt_idx" ON "ai_ingest_jobs"("startedAt");
CREATE INDEX IF NOT EXISTS "approval_line_templates_department_idx" ON "approval_line_templates"("department");
CREATE UNIQUE INDEX IF NOT EXISTS "integration_settings_provider_key" ON "integration_settings"("provider");

INSERT INTO "site_settings" ("id", "appName", "updatedAt")
VALUES ('default', 'Intranet', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "integration_settings" ("id", "provider", "displayName", "updatedAt")
VALUES
  ('instagram', 'instagram', 'Instagram', CURRENT_TIMESTAMP),
  ('company_web', 'company_web', '회사 홈페이지', CURRENT_TIMESTAMP)
ON CONFLICT ("provider") DO NOTHING;
