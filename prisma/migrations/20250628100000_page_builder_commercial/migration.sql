-- Page Builder 상용화: 테마·템플릿·버전 관리

CREATE TABLE "page_themes" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "cssVars" JSONB NOT NULL DEFAULT '{}',
    "canvasCss" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "dealerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "page_themes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "page_templates" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "targetSlug" TEXT NOT NULL,
    "thumbnail" TEXT,
    "projectData" JSONB NOT NULL DEFAULT '{}',
    "html" TEXT,
    "css" TEXT,
    "isBuiltIn" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "dealerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "page_templates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "page_layout_versions" (
    "id" TEXT NOT NULL,
    "layoutId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "projectData" JSONB NOT NULL,
    "html" TEXT,
    "css" TEXT,
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "page_layout_versions_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "page_layouts" ADD COLUMN "versionCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "page_layouts" ADD COLUMN "themeId" TEXT;

CREATE UNIQUE INDEX "page_themes_slug_key" ON "page_themes"("slug");
CREATE INDEX "page_themes_dealerId_idx" ON "page_themes"("dealerId");

CREATE UNIQUE INDEX "page_templates_slug_key" ON "page_templates"("slug");
CREATE INDEX "page_templates_targetSlug_sortOrder_idx" ON "page_templates"("targetSlug", "sortOrder");
CREATE INDEX "page_templates_dealerId_idx" ON "page_templates"("dealerId");

CREATE INDEX "page_layout_versions_layoutId_version_idx" ON "page_layout_versions"("layoutId", "version");

ALTER TABLE "page_themes" ADD CONSTRAINT "page_themes_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "dealers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "page_templates" ADD CONSTRAINT "page_templates_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "dealers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "page_layouts" ADD CONSTRAINT "page_layouts_themeId_fkey" FOREIGN KEY ("themeId") REFERENCES "page_themes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "page_layout_versions" ADD CONSTRAINT "page_layout_versions_layoutId_fkey" FOREIGN KEY ("layoutId") REFERENCES "page_layouts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
