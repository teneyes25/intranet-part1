-- CreateTable
CREATE TABLE "page_layouts" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "projectData" JSONB NOT NULL DEFAULT '{}',
    "html" TEXT,
    "css" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "page_layouts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "page_layouts_slug_key" ON "page_layouts"("slug");

-- Seed default layouts
INSERT INTO "page_layouts" ("id", "slug", "name", "projectData", "html", "css", "isPublished", "updatedAt")
VALUES
  ('pl_dashboard', 'dashboard', '대시보드', '{}', NULL, NULL, true, NOW()),
  ('pl_banner', 'banner', '메인 배너', '{}', NULL, NULL, true, NOW()),
  ('pl_pr', 'pr', '홍보실 상단', '{}', NULL, NULL, true, NOW())
ON CONFLICT ("slug") DO NOTHING;
