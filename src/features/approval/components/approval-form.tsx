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
  Paperclip,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RichTextEditor } from "@/features/board/components/rich-text-editor";
import { ROLE_LABELS, type Role } from "@/lib/auth/roles";
import { saveDocumentAction, type ActionState } from "../actions";
import { APPROVAL_STEP_TITLES } from "../step-titles";
import { OfficialDocumentFrame } from "./official-document-frame";
import {
  APPROVAL_KIND_OPTIONS,
  APPROVAL_MAX_FILES,
  APPROVAL_MAX_FILE_SIZE,
  APPROVAL_MAX_SEQUENTIAL_STEPS,
  APPROVAL_STEP_ROLE_OPTIONS,
  defaultTitleForRole,
  type ApprovalKind,
  type ApprovalStepRole,
} from "../kinds";

interface Template {
  id: string;
  name: string;
  key?: string;
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
  title: string;
  role: ApprovalStepRole;
}
interface ExistingAttachment {
  id: string;
  filename: string;
  size: number;
}
interface Initial {
  id: string;
  title: string;
  content: string;
  kind?: ApprovalKind | string;
  templateId: string | null;
  documentCategoryId: string | null;
  approvers: ApproverRow[];
  attachments?: ExistingAttachment[];
}

const initialState: ActionState = {};

export function ApprovalForm({
  templates,
  documentCategories,
  candidates,
  initial,
  drafter,
}: {
  templates: Template[];
  documentCategories: DocCategory[];
  candidates: Candidate[];
  initial?: Initial;
  drafter: { name: string; role: Role };
}) {
  const [state, formAction, pending] = useActionState(
    saveDocumentAction,
    initialState,
  );

  const [kind, setKind] = useState<ApprovalKind>(
    (initial?.kind as ApprovalKind) || "GENERAL",
  );
  const [title, setTitle] = useState(initial?.title ?? "");
  const [templateId, setTemplateId] = useState(initial?.templateId ?? "");
  const [documentCategoryId, setDocumentCategoryId] = useState(
    initial?.documentCategoryId ??
      documentCategories.find((c) => c.name === "전자결재")?.id ??
      documentCategories[0]?.id ??
      "",
  );
  const [content, setContent] = useState(initial?.content ?? "");
  const [approvers, setApprovers] = useState<ApproverRow[]>(
    initial?.approvers ?? [],
  );
  const [keptAttachments, setKeptAttachments] = useState<ExistingAttachment[]>(
    initial?.attachments ?? [],
  );
  const [newFiles, setNewFiles] = useState<File[]>([]);

  const [purpose, setPurpose] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMsg, setAiMsg] = useState<string | null>(null);
  const [liveHints, setLiveHints] = useState<string[]>([]);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [picker, setPicker] = useState("");
  const [pickerTitle, setPickerTitle] = useState("담당");
  const [pickerRole, setPickerRole] = useState<ApprovalStepRole>("HANDLER");

  const candidateMap = useMemo(
    () => new Map(candidates.map((c) => [c.id, c])),
    [candidates],
  );

  const steps = useMemo(() => {
    let order = 0;
    return approvers.map((a, i) => {
      if (i === 0) order = 1;
      else if (!a.parallelWithPrev) order += 1;
      return {
        approverId: a.approverId,
        stepOrder: order,
        title: a.title || null,
        role: a.role,
      };
    });
  }, [approvers]);

  const sequentialCount = useMemo(
    () => new Set(steps.filter((s) => s.role !== "COOPERATE").map((s) => s.stepOrder)).size,
    [steps],
  );

  const availableCandidates = candidates.filter(
    (c) => !approvers.some((a) => a.approverId === c.id),
  );

  const removedIds = (initial?.attachments ?? [])
    .filter((a) => !keptAttachments.some((k) => k.id === a.id))
    .map((a) => a.id);

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

  function applyKind(next: ApprovalKind) {
    setKind(next);
    const opt = APPROVAL_KIND_OPTIONS.find((k) => k.key === next);
    const tpl = templates.find((t) => t.key === opt?.templateKey);
    if (tpl) applyTemplate(tpl.id);
  }

  function addApprover() {
    if (!picker) return;
    if (
      pickerRole !== "COOPERATE" &&
      sequentialCount >= APPROVAL_MAX_SEQUENTIAL_STEPS
    ) {
      window.alert(`순차 결재는 최대 ${APPROVAL_MAX_SEQUENTIAL_STEPS}단계입니다.`);
      return;
    }
    const next: ApproverRow = {
      approverId: picker,
      parallelWithPrev: false,
      title: pickerTitle || defaultTitleForRole(pickerRole),
      role: pickerRole,
    };
    setApprovers((prev) => {
      if (pickerRole === "COOPERATE" && prev.length > 0) {
        const copy = [...prev];
        copy.splice(copy.length - 1, 0, next);
        return copy;
      }
      return [...prev, next];
    });
    setPicker("");
  }

  function setStepTitle(idx: number, title: string) {
    setApprovers((prev) => prev.map((a, i) => (i === idx ? { ...a, title } : a)));
  }
  function setStepRole(idx: number, role: ApprovalStepRole) {
    setApprovers((prev) =>
      prev.map((a, i) =>
        i === idx ? { ...a, role, title: defaultTitleForRole(role) } : a,
      ),
    );
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
          body: JSON.stringify({ title, purpose, templateName: tpl?.name }),
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
  }, [title, purpose, templateId, templates]);

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
        body: JSON.stringify({ title, purpose, templateName: tpl?.name }),
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
    } catch (e) {
      setAiMsg(e instanceof Error ? e.message : "생성 실패");
    } finally {
      setAiLoading(false);
    }
  }

  const previewSteps = approvers.map((a, i) => ({
    id: a.approverId,
    stepOrder: steps[i]?.stepOrder ?? i + 1,
    title: a.title,
    role: a.role,
    status: "PENDING",
    approver: {
      name: candidateMap.get(a.approverId)?.name ?? "결재자",
      role: candidateMap.get(a.approverId)?.role,
    },
  }));

  return (
    <form action={formAction} className="space-y-6" encType="multipart/form-data">
      {initial?.id && <input type="hidden" name="id" value={initial.id} />}
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="templateId" value={templateId} />
      <input type="hidden" name="documentCategoryId" value={documentCategoryId} />
      <input type="hidden" name="content" value={content} />
      <input type="hidden" name="steps" value={JSON.stringify(steps)} />
      <input type="hidden" name="removeAttachmentIds" value={removedIds.join(",")} />

      {state?.error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <div className="rounded-md border bg-neutral-50 p-4">
        <OfficialDocumentFrame
          kind={kind}
          title={title || "(제목 미입력)"}
          drafterName={drafter.name}
          drafterRole={drafter.role}
          draftedAt={new Date()}
          steps={previewSteps}
          compact
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="kind">기안 종류</Label>
          <select
            id="kind"
            value={kind}
            onChange={(e) => applyKind(e.target.value as ApprovalKind)}
            className="mt-1.5 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {APPROVAL_KIND_OPTIONS.map((k) => (
              <option key={k.key} value={k.key}>
                {k.label} — {k.hint}
              </option>
            ))}
          </select>
        </div>
        <div>
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
      </div>

      <div>
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

      <div>
        <Label htmlFor="docCat">문서함 (필수)</Label>
        <select
          id="docCat"
          value={documentCategoryId}
          onChange={(e) => setDocumentCategoryId(e.target.value)}
          required
          className="mt-1.5 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring sm:max-w-md"
        >
          <option value="">문서함 선택 (필수)</option>
          {documentCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-muted-foreground">
          기안 전에 문서함을 지정합니다. 최종 결재 후 해당 함에 자동 보관됩니다.
          {kind === "INTAKE" ? " 문서접수는 상신 시 FM-YYMMDD-000 번호가 부여됩니다." : ""}
        </p>
      </div>

      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-medium">
          <Sparkles className="h-4 w-4 text-primary" />
          메종이 기안 작성 지원
          <span className="text-xs font-normal text-muted-foreground">
            (6하원칙 · 행정안전부 공문 양식)
          </span>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            placeholder="기안 목적/요청 사항을 한 줄로 입력하세요"
          />
          <Button type="button" variant="outline" onClick={runAi} disabled={aiLoading}>
            {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            AI 초안 작성
          </Button>
        </div>
        {aiMsg && <p className="mt-2 text-xs text-muted-foreground">{aiMsg}</p>}
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
        <p className="mb-1 text-xs text-muted-foreground">
          아래한글/워드처럼 글꼴·크기·색·자간·자평·문단간격을 조정할 수 있습니다.
        </p>
        <div className="mt-1.5">
          <RichTextEditor value={content} onChange={setContent} />
        </div>
      </div>

      <div>
        <Label className="flex items-center gap-1">
          <Paperclip className="h-3.5 w-3.5" />
          첨부파일 (최대 {APPROVAL_MAX_FILES}개 · 파일당 100MB · PDF/사진 · 1년 보관)
          {kind === "INTAKE" ? " · 스캔 파일 필수" : ""}
        </Label>
        {keptAttachments.length > 0 && (
          <ul className="mt-2 space-y-1 text-sm">
            {keptAttachments.map((a) => (
              <li key={a.id} className="flex items-center gap-2">
                <span className="truncate">{a.filename}</span>
                <button
                  type="button"
                  className="text-xs text-destructive"
                  onClick={() =>
                    setKeptAttachments((prev) => prev.filter((x) => x.id !== a.id))
                  }
                >
                  삭제
                </button>
              </li>
            ))}
          </ul>
        )}
        <input
          type="file"
          name="files"
          multiple
          accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.bmp,.heic,.heif,.tif,.tiff,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.hwp,.txt,.csv,.zip"
          className="mt-2 block w-full text-sm"
          onChange={(e) => {
            const input = e.currentTarget;
            const list = Array.from(input.files ?? []);
            const tooBig = list.filter((f) => f.size > APPROVAL_MAX_FILE_SIZE);
            if (tooBig.length) {
              window.alert(
                `파일당 최대 ${APPROVAL_MAX_FILE_SIZE / 1024 / 1024}MB입니다.`,
              );
            }
            const room = APPROVAL_MAX_FILES - keptAttachments.length;
            const ok = list
              .filter((f) => f.size <= APPROVAL_MAX_FILE_SIZE)
              .slice(0, Math.max(0, room));
            const dt = new DataTransfer();
            ok.forEach((f) => dt.items.add(f));
            input.files = dt.files;
            setNewFiles(ok);
          }}
        />
        {newFiles.length > 0 && (
          <p className="mt-1 text-xs text-muted-foreground">
            새로 선택 {newFiles.length}개
          </p>
        )}
      </div>

      <div>
        <Label>결재선 지정</Label>
        <p className="mb-2 text-xs text-muted-foreground">
          담당자 → 팀장 → 이사 → 대표 순, 순차 최대 {APPROVAL_MAX_SEQUENTIAL_STEPS}단계.
          전결자는 대표 대신 최종 승인할 수 있고, 협조자는 최종 결재권자 직전에 들어갑니다.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
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
          <select
            value={pickerRole}
            onChange={(e) => {
              const role = e.target.value as ApprovalStepRole;
              setPickerRole(role);
              setPickerTitle(defaultTitleForRole(role));
            }}
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm sm:w-28"
            aria-label="결재 역할"
          >
            {APPROVAL_STEP_ROLE_OPTIONS.map((r) => (
              <option key={r.key} value={r.key}>
                {r.label}
              </option>
            ))}
          </select>
          <select
            value={pickerTitle}
            onChange={(e) => setPickerTitle(e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm sm:w-32"
            aria-label="결재란 직책"
          >
            {APPROVAL_STEP_TITLES.map((t) => (
              <option key={t} value={t}>
                {t}
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
                  key={`${a.approverId}-${i}`}
                  className="flex flex-wrap items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm"
                >
                  <Badge variant="secondary">{order}단계</Badge>
                  <span className="min-w-0 flex-1 truncate">
                    {c?.name}{" "}
                    <span className="text-xs text-muted-foreground">
                      {c ? ROLE_LABELS[c.role] : ""}
                    </span>
                  </span>
                  <select
                    value={a.role}
                    onChange={(e) => setStepRole(i, e.target.value as ApprovalStepRole)}
                    className="h-8 rounded-md border border-input bg-transparent px-2 text-xs"
                    aria-label="역할"
                  >
                    {APPROVAL_STEP_ROLE_OPTIONS.map((r) => (
                      <option key={r.key} value={r.key}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={a.title || "담당"}
                    onChange={(e) => setStepTitle(i, e.target.value)}
                    className="h-8 rounded-md border border-input bg-transparent px-2 text-xs"
                    aria-label="결재란 직책"
                  >
                    {APPROVAL_STEP_TITLES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  {i > 0 && (
                    <button
                      type="button"
                      onClick={() => toggleParallel(i)}
                      className="rounded border px-2 py-0.5 text-xs hover:bg-muted"
                    >
                      {a.parallelWithPrev ? "병렬" : "순차"}
                    </button>
                  )}
                  <button type="button" onClick={() => move(i, -1)} className="rounded p-1 text-muted-foreground hover:bg-muted" aria-label="위로">
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => move(i, 1)} className="rounded p-1 text-muted-foreground hover:bg-muted" aria-label="아래로">
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => remove(i)} className="rounded p-1 text-destructive hover:bg-destructive/10" aria-label="삭제">
                    <X className="h-4 w-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="flex justify-end gap-2 border-t pt-4">
        <Button type="submit" name="intent" value="draft" variant="outline" disabled={pending}>
          <Save className="h-4 w-4" />
          임시저장
        </Button>
        <Button type="submit" name="intent" value="submit" disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          상신(제출)
        </Button>
      </div>
    </form>
  );
}
