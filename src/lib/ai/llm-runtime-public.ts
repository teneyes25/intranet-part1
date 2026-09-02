/** 클라이언트용 LLM 프리셋 (server-only 없음) */
export type LlmProviderKind = "ollama" | "openai" | "openrouter" | "custom";

export type LlmRuntimeConfig = {
  provider: LlmProviderKind;
  baseUrl: string;
  apiKey: string;
  chatModel: string;
  availableModels: string[];
  lastModelSyncAt: string | null;
};

export const PRESET_PROVIDERS: {
  id: LlmProviderKind;
  label: string;
  baseUrl: string;
  defaultModel: string;
  apiKeyHint: string;
}[] = [
  {
    id: "ollama",
    label: "Ollama (로컬 오픈 LLM)",
    // Docker 앱 → 호스트 Ollama. 호스트에서 직접 실행 시 127.0.0.1 로 바꿔도 됨.
    baseUrl: "http://host.docker.internal:11434/v1",
    defaultModel: "llama3.2",
    apiKeyHint: "ollama (임의 값 가능)",
  },
  {
    id: "openai",
    label: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4o-mini",
    apiKeyHint: "sk-...",
  },
  {
    id: "openrouter",
    label: "OpenRouter (오픈 모델 허브)",
    baseUrl: "https://openrouter.ai/api/v1",
    defaultModel: "meta-llama/llama-3.1-8b-instruct",
    apiKeyHint: "sk-or-...",
  },
  {
    id: "custom",
    label: "기타 OpenAI 호환",
    baseUrl: "http://127.0.0.1:8000/v1",
    defaultModel: "local-model",
    apiKeyHint: "선택",
  },
];
