-- Phase 6: Pilot deployment preparation (Day 32)

DO $$ BEGIN
  ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'PILOT_FEEDBACK';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'SYSTEM_ERROR';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'USAGE_EVENT';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "pilot_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "bannerTitle" TEXT NOT NULL DEFAULT 'Pilot 테스트 기간',
    "bannerMessage" TEXT NOT NULL DEFAULT '현재 파일럿(Pilot) 테스트 중입니다. 피드백을 남겨 주세요.',
    "feedbackEnabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pilot_settings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "pilot_groups" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pilot_groups_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "pilot_group_members" (
    "id" TEXT NOT NULL,
    "pilotGroupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pilot_group_members_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "pilot_feedbacks" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "pageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pilot_feedbacks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "usage_metrics" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "event" TEXT NOT NULL,
    "resource" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "usage_metrics_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "system_error_logs" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "stack" TEXT,
    "notified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "system_error_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "pilot_groups_key_key" ON "pilot_groups"("key");
CREATE UNIQUE INDEX IF NOT EXISTS "pilot_group_members_pilotGroupId_userId_key" ON "pilot_group_members"("pilotGroupId", "userId");
CREATE INDEX IF NOT EXISTS "pilot_group_members_userId_idx" ON "pilot_group_members"("userId");
CREATE INDEX IF NOT EXISTS "pilot_feedbacks_createdAt_idx" ON "pilot_feedbacks"("createdAt");
CREATE INDEX IF NOT EXISTS "usage_metrics_event_createdAt_idx" ON "usage_metrics"("event", "createdAt");
CREATE INDEX IF NOT EXISTS "usage_metrics_createdAt_idx" ON "usage_metrics"("createdAt");
CREATE INDEX IF NOT EXISTS "system_error_logs_createdAt_idx" ON "system_error_logs"("createdAt");

DO $$ BEGIN
  ALTER TABLE "pilot_group_members" ADD CONSTRAINT "pilot_group_members_pilotGroupId_fkey"
    FOREIGN KEY ("pilotGroupId") REFERENCES "pilot_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "pilot_group_members" ADD CONSTRAINT "pilot_group_members_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "pilot_feedbacks" ADD CONSTRAINT "pilot_feedbacks_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

INSERT INTO "pilot_settings" ("id", "isActive", "updatedAt")
VALUES ('default', false, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "pilot_groups" ("id", "key", "name", "description", "updatedAt")
VALUES
  ('pilot-sales', 'sales', '본사 영업팀', 'Pilot 1차 — 영업·마케팅', CURRENT_TIMESTAMP),
  ('pilot-mgmt', 'mgmt', '관리팀', 'Pilot 1차 — IT·총무', CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "pilot_group_members" ("id", "pilotGroupId", "userId", "createdAt")
SELECT 'pgm-seed-admin', g.id, u.id, CURRENT_TIMESTAMP
FROM "pilot_groups" g, "users" u
WHERE g.key = 'mgmt' AND u.email = 'admin@intranet.local'
ON CONFLICT ("pilotGroupId", "userId") DO NOTHING;

INSERT INTO "pilot_group_members" ("id", "pilotGroupId", "userId", "createdAt")
SELECT 'pgm-seed-hq', g.id, u.id, CURRENT_TIMESTAMP
FROM "pilot_groups" g, "users" u
WHERE g.key = 'sales' AND u.email = 'hq@intranet.local'
ON CONFLICT ("pilotGroupId", "userId") DO NOTHING;
