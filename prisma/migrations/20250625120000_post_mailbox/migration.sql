-- Post mailbox: folders, labels, mail items

CREATE TABLE "post_folders" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "color" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "post_folders_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "post_labels" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#3B82F6',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "post_labels_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "post_mail_items" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "folderId" TEXT,
    "isImportant" BOOLEAN NOT NULL DEFAULT false,
    "isDraft" BOOLEAN NOT NULL DEFAULT false,
    "trashedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "post_mail_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "post_label_assignments" (
    "id" TEXT NOT NULL,
    "mailItemId" TEXT NOT NULL,
    "labelId" TEXT NOT NULL,

    CONSTRAINT "post_label_assignments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "post_folders_userId_boardId_slug_key" ON "post_folders"("userId", "boardId", "slug");
CREATE INDEX "post_folders_userId_boardId_idx" ON "post_folders"("userId", "boardId");

CREATE UNIQUE INDEX "post_labels_userId_boardId_name_key" ON "post_labels"("userId", "boardId", "name");
CREATE INDEX "post_labels_userId_boardId_idx" ON "post_labels"("userId", "boardId");

CREATE UNIQUE INDEX "post_mail_items_userId_postId_key" ON "post_mail_items"("userId", "postId");
CREATE INDEX "post_mail_items_userId_boardId_idx" ON "post_mail_items"("userId", "boardId");
CREATE INDEX "post_mail_items_userId_boardId_folderId_idx" ON "post_mail_items"("userId", "boardId", "folderId");
CREATE INDEX "post_mail_items_userId_boardId_trashedAt_idx" ON "post_mail_items"("userId", "boardId", "trashedAt");

CREATE UNIQUE INDEX "post_label_assignments_mailItemId_labelId_key" ON "post_label_assignments"("mailItemId", "labelId");

ALTER TABLE "post_folders" ADD CONSTRAINT "post_folders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "post_folders" ADD CONSTRAINT "post_folders_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "post_labels" ADD CONSTRAINT "post_labels_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "post_labels" ADD CONSTRAINT "post_labels_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "post_mail_items" ADD CONSTRAINT "post_mail_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "post_mail_items" ADD CONSTRAINT "post_mail_items_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "post_mail_items" ADD CONSTRAINT "post_mail_items_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "post_folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "post_label_assignments" ADD CONSTRAINT "post_label_assignments_mailItemId_fkey" FOREIGN KEY ("mailItemId") REFERENCES "post_mail_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "post_label_assignments" ADD CONSTRAINT "post_label_assignments_labelId_fkey" FOREIGN KEY ("labelId") REFERENCES "post_labels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "pageBuilderConfig" JSONB;
