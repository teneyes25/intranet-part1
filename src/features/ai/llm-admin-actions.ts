"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/session";
import {
  getLlmRuntimeConfig,
  saveLlmRuntimeConfig,
  syncLlmModels,
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
    apiKey,
    chatModel,
  });
  revalidatePath("/admin/ai-models");
  return { ok: true as const, config: saved };
}

export async function syncLlmModelsAction() {
  await requireRole(["ADMIN"]);
  const result = await syncLlmModels();
  revalidatePath("/admin/ai-models");
  if (result.error) return { error: result.error, models: result.models };
  return { ok: true as const, models: result.models };
}

export type { LlmRuntimeConfig };
