import "server-only";

import { spawn } from "node:child_process";

import {
  ensureDefaultLlmRuntimeConfig,
  getLlmRuntimeConfig,
  saveLlmRuntimeConfig,
  type LlmRuntimeConfig,
} from "@/lib/ai/llm-runtime";

export type LlmReady = {
  ok: boolean;
  provider: string;
  baseUrl: string;
  model: string;
  detail: string;
};

const g = globalThis as unknown as {
  llmEnsurePromise?: Promise<LlmReady>;
  llmEnsureAt?: number;
};

const CANDIDATE_BASES = [
  process.env.OPENAI_BASE_URL,
  "http://host.docker.internal:11434/v1",
  "http://127.0.0.1:11434/v1",
  "http://localhost:11434/v1",
].filter((u, i, a): u is string => Boolean(u) && a.indexOf(u) === i);

function ollamaRoot(base: string) {
  return base.replace(/\/$/, "").replace(/\/v1$/, "");
}

async function pingTags(base: string): Promise<string[] | null> {
  try {
    const res = await fetch(`${ollamaRoot(base)}/api/tags`, {
      method: "GET",
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      models?: { name?: string; model?: string }[];
    };
    return (data.models ?? [])
      .map((m) => m.name || m.model || "")
      .filter(Boolean);
  } catch {
    return null;
  }
}

async function warmupModel(base: string, model: string) {
  try {
    await fetch(`${ollamaRoot(base)}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        prompt: "ping",
        stream: false,
        options: { num_predict: 1 },
      }),
      signal: AbortSignal.timeout(90_000),
    });
  } catch (e) {
    console.warn("[llm-ensure] warmup failed:", e);
  }
}

function trySpawnOllamaServe() {
  try {
    const child = spawn("ollama", ["serve"], {
      detached: true,
      stdio: "ignore",
    });
    child.unref();
    console.log("[llm-ensure] spawned `ollama serve`");
    return true;
  } catch {
    return false;
  }
}

async function findLiveOllamaBase(): Promise<{
  base: string;
  models: string[];
} | null> {
  for (const base of CANDIDATE_BASES) {
    const models = await pingTags(base);
    if (models) return { base: base.replace(/\/$/, ""), models };
  }
  return null;
}

async function ensureOnce(): Promise<LlmReady> {
  const cfg = await ensureDefaultLlmRuntimeConfig();
  const isOllama =
    cfg.provider === "ollama" ||
    cfg.baseUrl.includes("11434") ||
    cfg.baseUrl.includes("ollama");

  if (!isOllama) {
    const keyOk = Boolean(cfg.apiKey);
    return {
      ok: keyOk,
      provider: cfg.provider,
      baseUrl: cfg.baseUrl,
      model: cfg.chatModel,
      detail: keyOk
        ? "클라우드/호환 LLM 설정이 있습니다."
        : "API 키가 없습니다. 관리자 → 메종이 LLM에서 키를 넣거나 Ollama를 켜 주세요.",
    };
  }

  let live = await findLiveOllamaBase();
  if (!live) {
    trySpawnOllamaServe();
    await new Promise((r) => setTimeout(r, 1500));
    live = await findLiveOllamaBase();
  }

  if (!live) {
    return {
      ok: false,
      provider: "ollama",
      baseUrl: cfg.baseUrl,
      model: cfg.chatModel,
      detail:
        "Ollama가 꺼져 있습니다. 사무실 PC에서 `ollama serve` 후 `ollama pull llama3.2` 를 실행하세요. Docker는 host.docker.internal:11434 로 접속합니다.",
    };
  }

  const patch: Partial<LlmRuntimeConfig> = {
    provider: "ollama",
    baseUrl: live.base.endsWith("/v1") ? live.base : `${live.base}/v1`,
    apiKey: cfg.apiKey || "ollama",
    availableModels: live.models,
    lastModelSyncAt: new Date().toISOString(),
  };
  const preferred =
    live.models.find((m) => m === cfg.chatModel) ||
    live.models.find((m) => m.startsWith("llama3")) ||
    live.models[0];
  if (preferred) patch.chatModel = preferred;

  const saved = await saveLlmRuntimeConfig(patch);
  if (saved.chatModel) {
    await warmupModel(saved.baseUrl, saved.chatModel);
  }

  return {
    ok: true,
    provider: "ollama",
    baseUrl: saved.baseUrl,
    model: saved.chatModel,
    detail: `Ollama 준비됨 (${saved.chatModel})`,
  };
}

/** 헬스체크용 — 워밍업 없이 연결만 확인 */
export async function peekLlmStatus(): Promise<LlmReady> {
  const cfg = await getLlmRuntimeConfig().catch(() => null);
  if (!cfg) {
    return {
      ok: false,
      provider: "unknown",
      baseUrl: "",
      model: "",
      detail: "설정 없음",
    };
  }
  const isOllama =
    cfg.provider === "ollama" || cfg.baseUrl.includes("11434");
  if (!isOllama) {
    return {
      ok: Boolean(cfg.apiKey),
      provider: cfg.provider,
      baseUrl: cfg.baseUrl,
      model: cfg.chatModel,
      detail: cfg.apiKey ? "키 설정됨" : "API 키 없음",
    };
  }
  const live = await findLiveOllamaBase();
  return {
    ok: Boolean(live),
    provider: "ollama",
    baseUrl: live?.base ?? cfg.baseUrl,
    model: cfg.chatModel,
    detail: live
      ? `Ollama 응답 (${live.models.length}개 모델)`
      : "Ollama 연결 안 됨",
  };
}

/** 인트라넷 기동·첫 대화 시 Ollama/LLM을 깨우고 모델 워밍업 */
export function ensureLlmReady(force = false): Promise<LlmReady> {
  const now = Date.now();
  if (
    !force &&
    g.llmEnsurePromise &&
    g.llmEnsureAt &&
    now - g.llmEnsureAt < 60_000
  ) {
    return g.llmEnsurePromise;
  }
  g.llmEnsureAt = now;
  g.llmEnsurePromise = ensureOnce().catch((e) => ({
    ok: false,
    provider: "unknown",
    baseUrl: "",
    model: "",
    detail: e instanceof Error ? e.message : "llm_ensure_failed",
  }));
  return g.llmEnsurePromise;
}
