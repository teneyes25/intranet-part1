import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { LlmModelAdmin } from "@/features/ai/components/llm-model-admin";
import { ensureDefaultLlmRuntimeConfig } from "@/lib/ai/llm-runtime";
import { requireRole } from "@/lib/auth/session";

export const metadata: Metadata = { title: "매종이 LLM 모델" };

export default async function AdminAiModelsPage() {
  await requireRole(["ADMIN"]);
  const config = await ensureDefaultLlmRuntimeConfig();

  return (
    <div className="space-y-6">
      <PageHeader
        title="매종이 LLM 모델"
        description="Ollama를 Provider로 쓰려면 아래 「Ollama (로컬 오픈 LLM)」을 선택한 뒤 저장·모델 동기화를 하세요. Docker 환경 Base URL은 host.docker.internal 을 사용합니다."
      />
      <LlmModelAdmin initial={config} />
    </div>
  );
}
