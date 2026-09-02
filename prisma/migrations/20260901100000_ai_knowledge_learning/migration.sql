-- Maejongi learning settings + curated knowledge materials
CREATE TABLE IF NOT EXISTS "ai_learning_settings" (
  "id" TEXT NOT NULL,
  "learnAllIntranet" BOOLEAN NOT NULL DEFAULT true,
  "learnCurated" BOOLEAN NOT NULL DEFAULT true,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ai_learning_settings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "ai_learning_settings" ("id", "learnAllIntranet", "learnCurated", "updatedAt")
VALUES ('default', true, true, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

CREATE TABLE IF NOT EXISTS "ai_knowledge_materials" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "fileName" TEXT,
  "storageKey" TEXT,
  "mimeType" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ai_knowledge_materials_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ai_knowledge_materials_isActive_createdAt_idx"
  ON "ai_knowledge_materials"("isActive", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ai_knowledge_materials_createdById_fkey'
  ) THEN
    ALTER TABLE "ai_knowledge_materials"
      ADD CONSTRAINT "ai_knowledge_materials_createdById_fkey"
      FOREIGN KEY ("createdById") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
