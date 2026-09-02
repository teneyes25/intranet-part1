-- Maejongi persona + casual chat settings
ALTER TABLE "ai_learning_settings"
  ADD COLUMN IF NOT EXISTS "allowCasualChat" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "ai_learning_settings"
  ADD COLUMN IF NOT EXISTS "personaIdentity" TEXT;

ALTER TABLE "ai_learning_settings"
  ADD COLUMN IF NOT EXISTS "personaRules" TEXT;
