-- AlterTable
ALTER TABLE "posts" ADD COLUMN "startsAt" TIMESTAMP(3),
ADD COLUMN "endsAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "posts_boardId_startsAt_idx" ON "posts"("boardId", "startsAt");
