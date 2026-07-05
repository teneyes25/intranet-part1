"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import {
  Sparkles,
  Loader2,
  Plus,
  ArrowUp,
  ArrowDown,
  X,
  Save,
  Send,
  ChevronLeft,
  ChevronRight,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { FormSteps } from "@/components/ui/form-steps";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RichTextEditor } from "@/features/board/components/rich-text-editor";
import { ROLE_LABELS, type Role } from "@/lib/auth/roles";
import { toast } from "sonner";
import { saveDocumentAction, type ActionState } from "../actions";

interface Template {
  id: string;
  name: string;
  content: string;
}
interface DocCategory {
  id: string;
  name: string;
}
interface Candidate {
  id: string;
  name: string;
  role: Role;
  dealerName?: string | null;
}
interface ApproverRow {
  approverId: string;
  parallelWithPrev: boolean;
}
interface Initial {
  id: string;
  title: string;
  content: string;
  templateId: string | null;
  documentCategoryId: string | null;
  amount: number | null;
  approvers: ApproverRow[];
}

const initialState: ActionState = {};

const APPROVAL_STEPS = [
  { id: "meta", label: "양식·제목" },
  { id: "body", label: "본문·AI" },
  { id: "line", label: "결재·제출" },
] as const;

export function ApprovalForm({
  templates,
  documentCategories,
  candidates,
  drafterRole,
  initial,
}: {
  templates: Template[];
  documentCategories: DocCategory[];
  candidates: Candidate[];
  drafterRole: Role;
  initial?: Initial;
}) {
  const [state, formAction, pending] = useActionState(
    saveDocumentAction,
    initialState,
  );

  const [title, setTitle] = useState(initial?.title ?? "");
  const [templateId, setTemplateId] = useState(initial?.templateId ?? "");
  const [documentCategoryId, setDocumentCategoryId] = useState(
    initial?.documentCategoryId ?? "",
  );
  const [amount, setAmount] = useState(
    initial?.amount != null ? String(initial.amount) : "",
  );
  const [content, setContent] = useState(initial?.content ?? "");
  const [approvers, setApprovers] = useState<ApproverRow[]>(
    initial?.approvers ?? [],
  );

  const [purpose, setPurpose] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [lineLoading, setLineLoading] = useState(false);
  const [aiMsg, setAiMsg] = useState<string | null>(null);
  const [liveHints, setLiveHints] = useState<string[]>([]);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [picker, setPicker] = useState("");
  const [step, setStep] = useState(0);

  const candidateMap = useMemo(
    () => new Map(candidates.map((c) => [c.id, c])),
    [candidates],
  );

  // 결재선 stepOrder 계산(병렬=이전과 동일 그룹)
  const steps = useMemo(() => {
    let order = 0;
    return approvers.map((a, i) => {
      if (i === 0) order = 1;
      else if (!a.parallelWithPrev) order += 1;
      return { approverId: a.approverId, stepOrder: order };
    });
  }, [approvers]);

  const availableCandidates = candidates.filter(
    (c) => !approvers.some((a) => a.approverId === c.id),
  );

  function applyTemplate(id: string) {
    setTemplateId(id);
    const tpl = templates.find((t) => t.id === id);
    if (!tpl) return;
    if (
      content.replace(/<[^>]*>/g, "").trim().length > 0 &&
      !window.confirm("현재 작성 내용을 템플릿으로 덮어쓸까요?")
    ) {
      return;
    }
    setContent(tpl.content);
  }

  function addApprover() {
    if (!picker) return;
    setApprovers((prev) => [
      ...prev,
      { approverId: picker, parallelWithPrev: false },
    ]);
    setPicker("");
  }

  function move(idx: number, dir: -1 | 1) {
    setApprovers((prev) => {
      const next = [...prev];
      const target = idx + dir;
      const a = next[idx];
      const b = next[target];
      if (!a || !b) return prev;
      next[idx] = b;
      next[target] = a;
      const first = next[0];
      if (first) first.parallelWithPrev = false;
      return next;
    });
  }

  function toggleParallel(idx: number) {
    setApprovers((prev) =>
      prev.map((a, i) =>
        i === idx ? { ...a, parallelWithPrev: !a.parallelWithPrev } : a,
      ),
    );
  }

  function remove(idx: number) {
    setApprovers((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      const first = next[0];
      if (first) first.parallelWithPrev = false;
      return next;
    });
  }

  // 실시간 AI 작성 힌트 (입력 후 800ms 디바운스)
  useEffect(() => {
    if (hintTimer.current) clearTimeout(hintTimer.current);
    if (!purpose.trim() && !title.trim()) {
      setLiveHints([]);
      return;
    }
    hintTimer.current = setTimeout(async () => {
      try {
        const tpl = templates.find((t) => t.id === templateId);
        const res = await fetch("/api/ai/draft/hint", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            purpose,
            templateName: tpl?.name,
            documentCategoryId: documentCategoryId || undefined,
          }),
        });
        const data = await res.json();
        if (res.ok && Array.isArray(data.hints)) setLiveHints(data.hints);
      } catch {
        /* ignore */
      }
    }, 800);
    return () => {
      if (hintTimer.current) clearTimeout(hintTimer.current);
    };
  }, [title, purpose, templateId, documentCategoryId, templates]);

  async function runComplianceToast() {
    try {
      const res = await fetch("/api/ai/draft/compliance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, steps }),
      });
      const data = await res.json();
      if (!res.ok) return;
      if (data.ok) {
        toast.success("Compliance: 필수 항목이 모두 작성되었습니다.");
      } else if (Array.isArray(data.missing) && data.missing.length > 0) {
        toast.warning(`누락 항목: ${data.missing.join(", ")}`);
      }
    } catch {
      /* ignore */
    }
  }

  async function runAi() {
    if (aiLoading) return;
    if (!purpose.trim() && !title.trim()) {
      setAiMsg("제목 또는 기안 목적을 입력하세요.");
      return;
    }
    setAiLoading(true);
    setAiMsg(null);
    try {
      const tpl = templates.find((t) => t.id === templateId);
      const res = await fetch("/api/ai/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          purpose,
          templateName: tpl?.name,
          documentCategoryId: documentCategoryId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "생성 실패");
      if (
        content.replace(/<[^>]*>/g, "").trim().length > 0 &&
        !window.confirm("현재 작성 내용을 AI 초안으로 덮어쓸까요?")
      ) {
        return;
      }
      setContent(data.content);
      setAiMsg(
        data.mode === "generative"
          ? "AI가 초안을 생성했습니다. 내용을 검토·수정하세요."
          : "AI 키 미설정으로 기본 골격을 생성했습니다.",
      );
      void runComplianceToast();
    } catch (e) {
      setAiMsg(e instanceof Error ? e.message : "생성 실패");
    } finally {
      setAiLoading(false);
    }
  }

  async function runRecommendLine() {
    if (lineLoading) return;
    setLineLoading(true);
    try {
      const parsedAmount = amount.trim()
        ? parseInt(amount.replace(/,/g, ""), 10)
        : undefined;
      const res = await fetch("/api/approval/recommend-line", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentCategoryId: documentCategoryId || undefined,
          drafterRole,
          amount: Number.isFinite(parsedAmount) ? parsedAmount : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "추천 실패");
      if (!Array.isArray(data.steps) || data.steps.length === 0) {
        toast.error("추천할 결재선을 찾지 못했습니다.");
        return;
      }
      if (
        approvers.length > 0 &&
        !window.confirm("현재 결재선을 AI 추천 결재선으로 교체할까요?")
      ) {
        return;
      }
      setApprovers(
        data.steps.map((s: { approverId: string }, i: number) => ({
          approverId: s.approverId,
          parallelWithPrev: i > 0 && data.steps[i].stepOrder === data.steps[i - 1].stepOrder,
        })),
      );
      toast.success(data.reason ?? "AI 추천 결재선을 적용했습니다.");
      void runComplianceToast();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "결재선 추천 실패");
    } finally {
      setLineLoading(false);
    }
  }

  return (
    <form action={formAction} className="space-y-6">
      {initial?.id && <input type="hidden" name="id" value={initial.id} />}
      <input type="hidden" name="templateId" value={templateId} />
      <input type="hidden" name="documentCategoryId" value={documentCategoryId} />
      <input type="hidden" name="amount" value={amount.replace(/,/g, "")} />
      <input type="hidden" name="content" value={content} />
      <input type="hidden" name="steps" value={JSON.stringify(steps)} />

      <FormSteps
        steps={[...APPROVAL_STEPS]}
        currentStep={step}
        onStepClick={(i) => {
          if (i < step || (i === 1 && title.trim()) || (i === 2 && title.trim())) {
            setStep(i);
          }
        }}
        className="rounded-xl border border-border/60 bg-muted/20 p-3"
      />

      {state?.error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      {step === 0 && (
      <>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="sm:col-span-1">
          <Label htmlFor="tpl">문서 양식</Label>
          <select
            id="tpl"
            value={templateId}
            onChange={(e) => applyTemplate(e.target.value)}
            className="mt-1.5 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">양식 선택 안 함</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="title">제목</Label>
          <Input
            id="title"
            name="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="기안서 제목을 입력하세요"
            className="mt-1.5"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="docCat">문서함 카테고리</Label>
        <select
          id="docCat"
          value={documentCategoryId}
          onChange={(e) => setDocumentCategoryId(e.target.value)}
          className="mt-1.5 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring sm:max-w-md"
        >
          <option value="">카테고리 선택 (선택)</option>
          {documentCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-muted-foreground">
          결재 완료 시 선택한 카테고리로 문서함에 자동 보관됩니다.
        </p>
      </div>

      <div>
        <Label htmlFor="amount">품의 금액 (원, 선택)</Label>
        <Input
          id="amount"
          type="text"
          inputMode="numeric"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^\d,]/g, ""))}
          placeholder="예: 1500000"
          className="mt-1.5 sm:max-w-xs"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          100만원 초과 시 AI 추천 결재선에 관리자 단계가 추가됩니다.
        </p>
      </div>

      <div className="flex justify-end border-t pt-4">
        <Button
          type="button"
          onClick={() => {
            if (!title.trim()) {
              toast.error("제목을 입력한 뒤 다음 단계로 이동하세요.");
              return;
            }
            setStep(1);
          }}
        >
          다음: 본문·AI
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      </>
      )}

      {step === 1 && (
      <>
      {/* AI 작성 지원 */}
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-medium">
          <Sparkles className="h-4 w-4 text-primary" />
          AI 기안 작성 지원
          <span className="text-xs font-normal text-muted-foreground">
            (행정안전부 공문 작성 지침 기반)
          </span>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            placeholder="기안 목적/요청 사항을 한 줄로 입력하세요 (예: 팀 워크숍 개최를 위한 예산 승인 요청)"
          />
          <Button
            type="button"
            variant="outline"
            onClick={runAi}
            disabled={aiLoading}
          >
            {aiLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            AI 초안 생성
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={runRecommendLine}
            disabled={lineLoading}
          >
            {lineLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Users className="h-4 w-4" />
            )}
            AI 추천 결재선
          </Button>
        </div>
        {aiMsg && (
          <p className="mt-2 text-xs text-muted-foreground">{aiMsg}</p>
        )}
        {liveHints.length > 0 && (
          <ul className="mt-2 space-y-1 rounded-md border border-dashed bg-background/60 p-2">
            {liveHints.map((h, i) => (
              <li key={i} className="flex gap-1.5 text-xs text-muted-foreground">
                <span className="text-primary">•</span>
                {h}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <Label>본문</Label>
        <div className="mt-1.5">
          <RichTextEditor value={content} onChange={setContent} />
        </div>
      </div>

      <div className="flex justify-between border-t pt-4">
        <Button type="button" variant="outline" onClick={() => setStep(0)}>
          <ChevronLeft className="h-4 w-4" />
          이전
        </Button>
        <Button type="button" onClick={() => {
          void runComplianceToast();
          setStep(2);
        }}>
          다음: 결재선
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      </>
      )}

      {step === 2 && (
      <>
      {/* 결재선 */}
      <div>
        <Label>결재선 지정</Label>
        <p className="mb-2 text-xs text-muted-foreground">
          순차(기본): 위에서 아래로 차례대로 결재 · 병렬: 같은 단계에서 동시
          결재
        </p>
        <div className="flex gap-2">
          <select
            value={picker}
            onChange={(e) => setPicker(e.target.value)}
            className="h-9 flex-1 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">결재자 선택...</option>
            {availableCandidates.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({ROLE_LABELS[c.role]}
                {c.dealerName ? ` · ${c.dealerName}` : ""})
              </option>
            ))}
          </select>
          <Button type="button" variant="outline" onClick={addApprover}>
            <Plus className="h-4 w-4" />
            추가
          </Button>
        </div>

        {approvers.length > 0 && (
          <ul className="mt-3 space-y-2">
            {approvers.map((a, i) => {
              const c = candidateMap.get(a.approverId);
              const order = steps[i]?.stepOrder ?? 1;
              return (
                <li
                  key={a.approverId}
                  className="flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm"
                >
                  <Badge variant="secondary">{order}단계</Badge>
                  <span className="flex-1 truncate">
                    {c?.name}{" "}
                    <span className="text-xs text-muted-foreground">
                      {c ? ROLE_LABELS[c.role] : ""}
                    </span>
                  </span>
                  {i > 0 && (
                    <button
                      type="button"
                      onClick={() => toggleParallel(i)}
                      className="rounded border px-2 py-0.5 text-xs hover:bg-muted"
                    >
                      {a.parallelWithPrev ? "병렬" : "순차"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => move(i, -1)}
                    className="rounded p-1 text-muted-foreground hover:bg-muted"
                    aria-label="위로"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    className="rounded p-1 text-muted-foreground hover:bg-muted"
                    aria-label="아래로"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    className="rounded p-1 text-destructive hover:bg-destructive/10"
                    aria-label="삭제"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-4">
        <Button type="button" variant="outline" onClick={() => setStep(1)}>
          <ChevronLeft className="h-4 w-4" />
          이전
        </Button>
        <div className="flex gap-2">
        <Button
          type="submit"
          name="intent"
          value="draft"
          variant="outline"
          disabled={pending}
        >
          <Save className="h-4 w-4" />
          임시저장
        </Button>
        <Button type="submit" name="intent" value="submit" disabled={pending} onClick={() => void runComplianceToast()}>
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          상신(제출)
        </Button>
        </div>
      </div>
      </>
      )}
    </form>
  );
}
