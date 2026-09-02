"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/session";
import {
  getLlmRuntimeConfig,
  saveLlmRuntimeConfig,
  syncLlmModels,
  PRESET_PROVIDERS,
  type LlmProviderKind,
  type LlmRuntimeConfig,
} from "@/lib/ai/llm-runtime";
import { runIngestJob } from "@/features/customize/ai-ingest-service";
import {
  createKnowledgeMaterial,
  deleteKnowledgeMaterial,
  saveLearningSettings,
  updateKnowledgeMaterial,
} from "@/features/ai/knowledge-service";

export async function getLlmSettingsAction() {
  await requireRole(["ADMIN"]);
  return getLlmRuntimeConfig();
}

export async function saveLlmSettingsAction(formData: FormData) {
  await requireRole(["ADMIN"]);
  const provider = String(formData.get("provider") ?? "ollama") as LlmProviderKind;
  const baseUrl = String(formData.get("baseUrl") ?? "").trim();
  const apiKey = String(formData.get("apiKey") ?? "").trim();
  const chatModel = String(formData.get("chatModel") ?? "").trim();
  if (!baseUrl || !chatModel) {
    return { error: "Base URL과 모델을 입력하세요." };
  }
  const saved = await saveLlmRuntimeConfig({
    provider,
    baseUrl,
    apiKey: apiKey || (provider === "ollama" ? "ollama" : ""),
    chatModel,
  });
  revalidatePath("/admin/ai-models");
  return { ok: true as const, config: saved };
}

/** 원클릭: Provider=Ollama + Docker용 Base URL 저장 */
export async function applyOllamaPresetAction() {
  await requireRole(["ADMIN"]);
  const preset = PRESET_PROVIDERS.find((p) => p.id === "ollama");
  if (!preset) return { error: "Ollama 프리셋이 없습니다." };
  const saved = await saveLlmRuntimeConfig({
    provider: "ollama",
    baseUrl: preset.baseUrl,
    apiKey: "ollama",
    chatModel: preset.defaultModel,
  });
  const synced = await syncLlmModels(saved);
  revalidatePath("/admin/ai-models");
  return {
    ok: true as const,
    config: saved,
    models: synced.models,
    syncError: synced.error,
  };
}

export async function syncLlmModelsAction() {
  await requireRole(["ADMIN"]);
  const result = await syncLlmModels();
  revalidatePath("/admin/ai-models");
  if (result.error) return { error: result.error, models: result.models };
  return { ok: true as const, models: result.models };
}

/** 인트라넷 지식 동기화 (기본: 전체 + 지정 자료) */
export async function syncKnowledgeAction(formData?: FormData) {
  const user = await requireRole(["ADMIN"]);
  const scopeRaw = String(formData?.get("scope") ?? "all");
  const scope =
    scopeRaw === "boards" || scopeRaw === "curated" ? scopeRaw : "all";
  const boardKeys =
    formData?.getAll("boardKeys").map(String).filter(Boolean) ?? [];
  try {
    const result = await runIngestJob({
      triggeredById: user.id,
      scope,
      boardKeys,
    });
    revalidatePath("/admin/ai-models");
    revalidatePath("/admin/customize");
    revalidatePath("/ai-agent");
    return { ok: true as const, ...result };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "지식 동기화 실패" };
  }
}

export async function saveLearningSettingsAction(formData: FormData) {
  await requireRole(["ADMIN"]);
  const learnAllIntranet = formData.get("learnAllIntranet") === "on";
  let learnCurated = formData.get("learnCurated") === "on";
  const allowCasualChat = formData.get("allowCasualChat") === "on";
  if (!learnAllIntranet && !learnCurated) learnCurated = true;
  const saved = await saveLearningSettings({
    learnAllIntranet,
    learnCurated,
    allowCasualChat,
  });
  revalidatePath("/admin/ai-models");
  return { ok: true as const, settings: saved };
}

export async function savePersonaAction(formData: FormData) {
  await requireRole(["ADMIN"]);
  const personaIdentity = String(formData.get("personaIdentity") ?? "");
  const personaRules = String(formData.get("personaRules") ?? "");
  const allowCasualChat = formData.get("allowCasualChat") === "on";
  const reset = formData.get("reset") === "1";
  const saved = await saveLearningSettings({
    allowCasualChat,
    personaIdentity: reset ? null : personaIdentity,
    personaRules: reset ? null : personaRules,
  });
  revalidatePath("/admin/ai-models");
  revalidatePath("/ai-agent");
  return { ok: true as const, settings: saved };
}

export async function createKnowledgeMaterialAction(formData: FormData) {
  const user = await requireRole(["ADMIN"]);
  const title = String(formData.get("title") ?? "");
  const content = String(formData.get("content") ?? "");
  const file = formData.get("file");
  try {
    const row = await createKnowledgeMaterial({
      userId: user.id,
      title,
      content,
      file: file instanceof File && file.size > 0 ? file : null,
    });
    revalidatePath("/admin/ai-models");
    return { ok: true as const, id: row.id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "자료 등록 실패" };
  }
}

export async function toggleKnowledgeMaterialAction(formData: FormData) {
  await requireRole(["ADMIN"]);
  const id = String(formData.get("id") ?? "");
  const isActive = formData.get("isActive") === "true";
  try {
    await updateKnowledgeMaterial({ id, isActive });
    revalidatePath("/admin/ai-models");
    return { ok: true as const };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "변경 실패" };
  }
}

export async function deleteKnowledgeMaterialAction(formData: FormData) {
  await requireRole(["ADMIN"]);
  const id = String(formData.get("id") ?? "");
  try {
    await deleteKnowledgeMaterial(id);
    revalidatePath("/admin/ai-models");
    return { ok: true as const };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "삭제 실패" };
  }
}

export type { LlmRuntimeConfig };
