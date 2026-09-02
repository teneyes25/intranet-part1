import "server-only";

import { prisma } from "@/lib/prisma";
import {
  OPENAI_API_KEY as ENV_KEY,
  OPENAI_CHAT_MODEL as ENV_MODEL,
  OPENAI_BASE_URL as ENV_BASE,
} from "@/lib/ai/config";
import {
  PRESET_PROVIDERS,
  type LlmProviderKind,
  type LlmRuntimeConfig,
} from "@/lib/ai/llm-runtime-public";

export { PRESET_PROVIDERS };
export type { LlmProviderKind, LlmRuntimeConfig };

const LLM_PROVIDER_KEY = "llm";

/** Docker 컨테이너에서 호스트 PC의 Ollama로 접속할 때 사용 */
const OLLAMA_DOCKER_BASE = "http://host.docker.internal:11434/v1";

function buildDefaults(): LlmRuntimeConfig {
  const envLooksOllama = ENV_BASE.includes("11434") || ENV_BASE.includes("ollama");
  const preferOllama = envLooksOllama || !ENV_KEY;
  return {
    provider: preferOllama ? "ollama" : "openai",
    baseUrl:
      ENV_BASE ||
      (preferOllama ? OLLAMA_DOCKER_BASE : "https://api.openai.com/v1"),
    apiKey: ENV_KEY || (preferOllama ? "ollama" : ""),
    chatModel: ENV_MODEL || (preferOllama ? "llama3.2" : "gpt-4o-mini"),
    availableModels: [],
    lastModelSyncAt: null,
  };
}

const DEFAULTS: LlmRuntimeConfig = buildDefaults();

function asConfig(raw: unknown): LlmRuntimeConfig {
  if (!raw || typeof raw !== "object") return { ...DEFAULTS };
  const m = raw as Record<string, unknown>;
  return {
    provider: (["ollama", "openai", "openrouter", "custom"].includes(
      String(m.provider),
    )
      ? String(m.provider)
      : DEFAULTS.provider) as LlmProviderKind,
    baseUrl: String(m.baseUrl || DEFAULTS.baseUrl),
    apiKey: String(m.apiKey ?? DEFAULTS.apiKey),
    chatModel: String(m.chatModel || DEFAULTS.chatModel),
    availableModels: Array.isArray(m.availableModels)
      ? m.availableModels.map(String)
      : [],
    lastModelSyncAt:
      typeof m.lastModelSyncAt === "string" ? m.lastModelSyncAt : null,
  };
}

/**
 * DB에 LLM 설정이 없으면 Ollama 기본값으로 한 번 저장해 둔다.
 * (사무실에서 Provider를 따로 고르지 않아도 메종이가 Ollama를 쓰도록)
 */
export async function ensureDefaultLlmRuntimeConfig(): Promise<LlmRuntimeConfig> {
  const existing = await prisma.integrationSetting.findUnique({
    where: { provider: LLM_PROVIDER_KEY },
  });
  if (existing) return getLlmRuntimeConfig();
  return saveLlmRuntimeConfig(buildDefaults());
}

export async function getLlmRuntimeConfig(): Promise<LlmRuntimeConfig> {
  const row = await prisma.integrationSetting.findUnique({
    where: { provider: LLM_PROVIDER_KEY },
  });
  if (!row) return { ...DEFAULTS };
  const fromMeta = asConfig(row.metadata);
  return {
    ...fromMeta,
    apiKey: row.apiKey || fromMeta.apiKey || DEFAULTS.apiKey,
    baseUrl: fromMeta.baseUrl || row.webhookUrl || DEFAULTS.baseUrl,
  };
}

export async function saveLlmRuntimeConfig(
  patch: Partial<LlmRuntimeConfig>,
): Promise<LlmRuntimeConfig> {
  const current = await getLlmRuntimeConfig();
  const next: LlmRuntimeConfig = {
    ...current,
    ...patch,
    availableModels: patch.availableModels ?? current.availableModels,
  };
  await prisma.integrationSetting.upsert({
    where: { provider: LLM_PROVIDER_KEY },
    create: {
      provider: LLM_PROVIDER_KEY,
      displayName: "메종이 LLM",
      apiKey: next.apiKey || null,
      webhookUrl: next.baseUrl,
      isEnabled: true,
      metadata: next,
    },
    update: {
      displayName: "메종이 LLM",
      apiKey: next.apiKey || null,
      webhookUrl: next.baseUrl,
      isEnabled: true,
      metadata: next,
    },
  });
  return next;
}

/** Ollama / OpenAI 호환 엔드포인트에서 모델 목록 동기화 */
export async function syncLlmModels(
  cfg?: LlmRuntimeConfig,
): Promise<{ models: string[]; error?: string }> {
  const config = cfg ?? (await getLlmRuntimeConfig());
  const base = config.baseUrl.replace(/\/$/, "");

  try {
    if (config.provider === "ollama" || base.includes("11434")) {
      const ollamaRoot = base.replace(/\/v1$/, "");
      const res = await fetch(`${ollamaRoot}/api/tags`, {
        method: "GET",
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) {
        return { models: [], error: `Ollama tags HTTP ${res.status}` };
      }
      const data = (await res.json()) as {
        models?: { name?: string; model?: string }[];
      };
      const models = (data.models ?? [])
        .map((m) => m.name || m.model || "")
        .filter(Boolean)
        .sort();
      await saveLlmRuntimeConfig({
        availableModels: models,
        lastModelSyncAt: new Date().toISOString(),
        ...(models.length && !models.includes(config.chatModel)
          ? { chatModel: models[0] }
          : {}),
      });
      return { models };
    }

    const res = await fetch(`${base}/models`, {
      headers: config.apiKey
        ? { Authorization: `Bearer ${config.apiKey}` }
        : {},
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      return { models: [], error: `models HTTP ${res.status}` };
    }
    const data = (await res.json()) as { data?: { id?: string }[] };
    const models = (data.data ?? [])
      .map((m) => m.id || "")
      .filter(Boolean)
      .sort();
    await saveLlmRuntimeConfig({
      availableModels: models,
      lastModelSyncAt: new Date().toISOString(),
    });
    return { models };
  } catch (e) {
    return {
      models: [],
      error: e instanceof Error ? e.message : "sync_failed",
    };
  }
}
