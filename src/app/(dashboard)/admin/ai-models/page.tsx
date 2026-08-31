import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { LlmModelAdmin } from "@/features/ai/components/llm-model-admin";
import { getLlmRuntimeConfig } from "@/lib/ai/llm-runtime";
import { requireRole } from "@/lib/auth/session";

export const metadata: Metadata = { title: "매종이 LLM 모델" };

export default async function AdminAiModelsPage() {
  await requireRole(["ADMIN"]);
  const config = await getLlmRuntimeConfig();

  return (
    <div className="space-y-6">
      <PageHeader
        title="매종이 LLM 모델"
        description="Ollama 최신 오픈 모델을 동기화하거나, OpenAI·OpenRouter 등 다른 오픈/호환 LLM을 선택해 매종이 답변에 적용합니다."
      />
      <LlmModelAdmin initial={config} />
    </div>
  );
}
