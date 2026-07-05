-- CreateIndex
CREATE INDEX IF NOT EXISTS "posts_created_at_idx" ON "posts"("createdAt" DESC);
CREATE INDEX IF NOT EXISTS "posts_view_count_idx" ON "posts"("viewCount" DESC);
CREATE INDEX IF NOT EXISTS "posts_board_id_category_idx" ON "posts"("boardId", "category");
CREATE INDEX IF NOT EXISTS "product_skus_product_post_id_idx" ON "product_skus"("productPostId");
CREATE INDEX IF NOT EXISTS "notifications_user_id_read_created_at_idx" ON "notifications"("userId", "read", "createdAt" DESC);
