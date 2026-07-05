-- AlterTable
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "eventStart" TIMESTAMP(3);
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "eventEnd" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "posts_board_id_event_start_idx" ON "posts"("boardId", "eventStart");
