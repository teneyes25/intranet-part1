"use client";

import { useState, useTransition } from "react";
import { Loader2, RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { savePersonaAction } from "@/features/ai/llm-admin-actions";
import {
  DEFAULT_PERSONA_IDENTITY,
  DEFAULT_PERSONA_RULES,
} from "@/lib/ai/persona-defaults";

export function LlmPersonaAdmin({
  settings,
}: {
  settings: {
    allowCasualChat: boolean;
    personaIdentity: string;
    personaRules: string;
  };
}) {
  const [pending, start] = useTransition();
  const [identity, setIdentity] = useState(settings.personaIdentity);
  const [rules, setRules] = useState(settings.personaRules);
  const [casual, setCasual] = useState(settings.allowCasualChat);

  return (
    <section className="space-y-4 rounded-lg border p-4">
      <div>
        <h3 className="font-semibold">메종이 페르소나</h3>
        <p className="text-sm text-muted-foreground">
          시스템 관리자가 메종이의 성격·역할·답변 규칙을 직접 입력할 수 있습니다.
          저장 즉시 대화에 반영됩니다.
        </p>
      </div>

      <form
        className="space-y-3"
        action={(fd) =>
          start(async () => {
            fd.set("personaIdentity", identity);
            fd.set("personaRules", rules);
            fd.set("allowCasualChat", casual ? "on" : "");
            const r = await savePersonaAction(fd);
            if ("error" in r && typeof r.error === "string") toast.error(r.error);
            else toast.success("페르소나를 저장했습니다.");
          })
        }
      >
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={casual}
            onChange={(e) => setCasual(e.target.checked)}
          />
          일상 대화·날씨·일반/시사 뉴스 요약 허용
        </label>

        <div className="space-y-1">
          <Label>정체성 / 역할</Label>
          <textarea
            value={identity}
            onChange={(e) => setIdentity(e.target.value)}
            rows={8}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label>답변 규칙</Label>
          <textarea
            value={rules}
            onChange={(e) => setRules(e.target.value)}
            rows={10}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            페르소나 저장
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const fd = new FormData();
                fd.set("reset", "1");
                fd.set("allowCasualChat", "on");
                const r = await savePersonaAction(fd);
                if ("error" in r && typeof r.error === "string") {
                  toast.error(r.error);
                  return;
                }
                setIdentity(DEFAULT_PERSONA_IDENTITY);
                setRules(DEFAULT_PERSONA_RULES);
                setCasual(true);
                toast.success("기본 페르소나로 초기화했습니다.");
              })
            }
          >
            <RotateCcw className="h-4 w-4" />
            기본값으로 초기화
          </Button>
        </div>
      </form>
    </section>
  );
}
