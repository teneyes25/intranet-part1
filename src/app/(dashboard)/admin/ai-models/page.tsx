import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { LlmModelAdmin } from "@/features/ai/components/llm-model-admin";
import { LlmKnowledgeAdmin } from "@/features/ai/components/llm-knowledge-admin";
import { listIngestJobs } from "@/features/customize/ai-ingest-service";
import {
  getLearningSettings,
  listKnowledgeMaterials,
} from "@/features/ai/knowledge-service";
import { ensureDefaultLlmRuntimeConfig } from "@/lib/ai/llm-runtime";
import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "매종이 LLM 모델" };

export default async function AdminAiModelsPage() {
  await requireRole(["ADMIN"]);
  const [config, settings, materials, boards, jobs] = await Promise.all([
    ensureDefaultLlmRuntimeConfig(),
    getLearningSettings(),
    listKnowledgeMaterials(),
    prisma.board.findMany({
      select: { key: true, name: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    listIngestJobs(8),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="매종이 LLM 모델"
        description="Ollama Provider 설정, 지식 동기화, 지정 학습 자료 업로드를 한곳에서 관리합니다. 기본은 인트라넷 전체 학습이며, 매종이는 오류·모순을 인정·검증하도록 안내됩니다."
      />
      <LlmModelAdmin initial={config} />
      <LlmKnowledgeAdmin
        settings={settings}
        materials={materials}
        boards={boards}
        jobs={jobs}
      />
    </div>
  );
}
