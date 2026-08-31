"use client";

import { useState, useTransition } from "react";
import { Loader2, RefreshCw, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  saveLlmSettingsAction,
  syncLlmModelsAction,
} from "@/features/ai/llm-admin-actions";
import {
  PRESET_PROVIDERS,
  type LlmProviderKind,
  type LlmRuntimeConfig,
} from "@/lib/ai/llm-runtime-public";

export function LlmModelAdmin({ initial }: { initial: LlmRuntimeConfig }) {
  const [pending, start] = useTransition();
  const [provider, setProvider] = useState<LlmProviderKind>(initial.provider);
  const [baseUrl, setBaseUrl] = useState(initial.baseUrl);
  const [apiKey, setApiKey] = useState(initial.apiKey);
  const [chatModel, setChatModel] = useState(initial.chatModel);
  const [models, setModels] = useState(initial.availableModels);
  const [lastSync, setLastSync] = useState(initial.lastModelSyncAt);

  function applyPreset(id: LlmProviderKind) {
    const p = PRESET_PROVIDERS.find((x) => x.id === id);
    if (!p) return;
    setProvider(id);
    setBaseUrl(p.baseUrl);
    setChatModel(p.defaultModel);
    if (id === "ollama" && !apiKey) setApiKey("ollama");
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {PRESET_PROVIDERS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => applyPreset(p.id)}
            className={
              provider === p.id
                ? "rounded-lg border-2 border-primary bg-primary/5 p-3 text-left text-sm"
                : "rounded-lg border p-3 text-left text-sm hover:bg-muted/40"
            }
          >
            <span className="font-medium">{p.label}</span>
            <span className="mt-1 block text-xs text-muted-foreground">
              {p.baseUrl}
            </span>
          </button>
        ))}
      </div>

      <form
        className="space-y-4 rounded-lg border p-4"
        action={(fd) =>
          start(async () => {
            const r = await saveLlmSettingsAction(fd);
            if (r.error) toast.error(r.error);
            else toast.success("LLM 설정을 저장했습니다.");
          })
        }
      >
        <input type="hidden" name="provider" value={provider} />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Base URL</Label>
            <Input
              name="baseUrl"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>API Key</Label>
            <Input
              name="apiKey"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="ollama / sk-..."
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>채팅 모델</Label>
          {models.length > 0 ? (
            <select
              name="chatModel"
              value={chatModel}
              onChange={(e) => setChatModel(e.target.value)}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            >
              {[chatModel, ...models.filter((m) => m !== chatModel)].map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          ) : (
            <Input
              name="chatModel"
              value={chatModel}
              onChange={(e) => setChatModel(e.target.value)}
              required
            />
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            저장
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() =>
              start(async () => {
                // 먼저 현재 입력값 저장 후 동기화
                const fd = new FormData();
                fd.set("provider", provider);
                fd.set("baseUrl", baseUrl);
                fd.set("apiKey", apiKey);
                fd.set("chatModel", chatModel);
                await saveLlmSettingsAction(fd);
                const r = await syncLlmModelsAction();
                if (r.error) toast.error(r.error);
                else {
                  setModels(r.models ?? []);
                  setLastSync(new Date().toISOString());
                  if (r.models?.[0] && !r.models.includes(chatModel)) {
                    setChatModel(r.models[0]);
                  }
                  toast.success(`모델 ${r.models?.length ?? 0}개 동기화`);
                }
              })
            }
          >
            <RefreshCw className="h-4 w-4" />
            Ollama/모델 목록 동기화
          </Button>
        </div>
        {lastSync && (
          <p className="text-xs text-muted-foreground">
            최근 동기화:{" "}
            {new Intl.DateTimeFormat("ko-KR", {
              dateStyle: "medium",
              timeStyle: "short",
            }).format(new Date(lastSync))}
          </p>
        )}
      </form>

      {models.length > 0 && (
        <div className="rounded-lg border p-4">
          <p className="mb-2 text-sm font-medium">사용 가능 모델</p>
          <ul className="flex flex-wrap gap-2">
            {models.map((m) => (
              <li key={m}>
                <button
                  type="button"
                  className={
                    m === chatModel
                      ? "rounded-full bg-primary px-2.5 py-1 text-xs text-primary-foreground"
                      : "rounded-full border px-2.5 py-1 text-xs hover:bg-muted"
                  }
                  onClick={() => setChatModel(m)}
                >
                  {m}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
