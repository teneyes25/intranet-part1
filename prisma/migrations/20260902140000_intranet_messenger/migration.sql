-- Intranet messenger
-- ADD VALUE cannot run inside a DO/function; IF NOT EXISTS is PG 10+.
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'MESSENGER';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'MESSENGER_BACKUP';

CREATE TABLE IF NOT EXISTS "messenger_profiles" (
  "userId" TEXT NOT NULL,
  "photoStorageKey" TEXT,
  "workplace" TEXT,
  "title" TEXT,
  "rank" TEXT,
  "hiredAt" TIMESTAMP(3),
  "lastSeenAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "messenger_profiles_pkey" PRIMARY KEY ("userId")
);

DO $$ BEGIN
  ALTER TABLE "messenger_profiles"
    ADD CONSTRAINT "messenger_profiles_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "messenger_rooms" (
  "id" TEXT NOT NULL,
  "isGroup" BOOLEAN NOT NULL DEFAULT false,
  "title" TEXT,
  "pairKey" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "messenger_rooms_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "messenger_rooms_pairKey_key" ON "messenger_rooms"("pairKey");
CREATE INDEX IF NOT EXISTS "messenger_rooms_updatedAt_idx" ON "messenger_rooms"("updatedAt");

CREATE TABLE IF NOT EXISTS "messenger_room_members" (
  "id" TEXT NOT NULL,
  "roomId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "lastReadAt" TIMESTAMP(3),
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "messenger_room_members_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "messenger_room_members_roomId_userId_key"
  ON "messenger_room_members"("roomId", "userId");
CREATE INDEX IF NOT EXISTS "messenger_room_members_userId_idx" ON "messenger_room_members"("userId");

DO $$ BEGIN
  ALTER TABLE "messenger_room_members"
    ADD CONSTRAINT "messenger_room_members_roomId_fkey"
    FOREIGN KEY ("roomId") REFERENCES "messenger_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "messenger_room_members"
    ADD CONSTRAINT "messenger_room_members_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "messenger_messages" (
  "id" TEXT NOT NULL,
  "roomId" TEXT NOT NULL,
  "senderId" TEXT NOT NULL,
  "body" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "messenger_messages_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "messenger_messages_roomId_createdAt_idx"
  ON "messenger_messages"("roomId", "createdAt");
CREATE INDEX IF NOT EXISTS "messenger_messages_createdAt_idx" ON "messenger_messages"("createdAt");

DO $$ BEGIN
  ALTER TABLE "messenger_messages"
    ADD CONSTRAINT "messenger_messages_roomId_fkey"
    FOREIGN KEY ("roomId") REFERENCES "messenger_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "messenger_messages"
    ADD CONSTRAINT "messenger_messages_senderId_fkey"
    FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "messenger_attachments" (
  "id" TEXT NOT NULL,
  "messageId" TEXT NOT NULL,
  "filename" TEXT NOT NULL,
  "storageKey" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "messenger_attachments_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "messenger_attachments_messageId_idx" ON "messenger_attachments"("messageId");

DO $$ BEGIN
  ALTER TABLE "messenger_attachments"
    ADD CONSTRAINT "messenger_attachments_messageId_fkey"
    FOREIGN KEY ("messageId") REFERENCES "messenger_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "messenger_logs" (
  "id" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "actorId" TEXT,
  "targetUserId" TEXT,
  "roomId" TEXT,
  "messageId" TEXT,
  "detail" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "messenger_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "messenger_logs_createdAt_idx" ON "messenger_logs"("createdAt");
CREATE INDEX IF NOT EXISTS "messenger_logs_actorId_createdAt_idx" ON "messenger_logs"("actorId", "createdAt");

DO $$ BEGIN
  ALTER TABLE "messenger_logs"
    ADD CONSTRAINT "messenger_logs_actorId_fkey"
    FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "messenger_backup_notice_logs" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "month" INTEGER NOT NULL,
  "purged" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "messenger_backup_notice_logs_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "messenger_backup_notice_logs_userId_year_month_key"
  ON "messenger_backup_notice_logs"("userId", "year", "month");
CREATE INDEX IF NOT EXISTS "messenger_backup_notice_logs_year_month_idx"
  ON "messenger_backup_notice_logs"("year", "month");
