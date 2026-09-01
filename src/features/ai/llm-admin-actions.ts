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

export type { LlmRuntimeConfig };
