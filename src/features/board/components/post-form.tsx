"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Loader2, Paperclip, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RichTextEditor } from "@/features/board/components/rich-text-editor";
import { formatFileSize, toDatetimeLocalValue } from "@/features/board/utils";
import {
  createPostAction,
  updatePostAction,
  type ActionState,
} from "@/features/board/actions";
import { MAX_FILES } from "@/features/board/constants";

interface ExistingAttachment {
  id: string;
  filename: string;
  size: number;
}

interface PostFormProps {
  mode: "create" | "edit";
  boardKey: string;
  categories: string[];
  authorPhone?: string | null;
  initial?: {
    postId: string;
    title: string;
    content: string;
    category: string | null;
    startsAt?: string | Date | null;
    endsAt?: string | Date | null;
    attachments: ExistingAttachment[];
  };
}

const NONE = "__none__";
const initialState: ActionState = { error: null };

type DraftPayload = {
  title: string;
  content: string;
  category: string;
  startsAt: string;
  endsAt: string;
  smsSenderPhone: string;
  sendContactNotify: boolean;
  savedAt: number;
};

function draftKey(boardKey: string, mode: string, postId?: string) {
  return `intranet:post-draft:${mode}:${boardKey}:${postId ?? "new"}`;
}

export function PostForm({
  mode,
  boardKey,
  categories,
  authorPhone,
  initial,
}: PostFormProps) {
  const action = mode === "create" ? createPostAction : updatePostAction;
  const [state, formAction, isPending] = useActionState(action, initialState);

  const [title, setTitle] = useState(initial?.title ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [category, setCategory] = useState(initial?.category ?? NONE);
  const [startsAt, setStartsAt] = useState(
    toDatetimeLocalValue(initial?.startsAt) || "",
  );
  const [endsAt, setEndsAt] = useState(
    toDatetimeLocalValue(initial?.endsAt) || "",
  );
  const [smsSender, setSmsSender] = useState(authorPhone ?? "");
  const [sendSms, setSendSms] = useState(false);
  const [removeIds, setRemoveIds] = useState<Set<string>>(new Set());
  const [draftHint, setDraftHint] = useState<string | null>(null);
  const restored = useRef(false);

  // 로컬 임시저장 복원 (작성 중 오류·새로고침 대비)
  useEffect(() => {
    if (restored.current || typeof window === "undefined") return;
    restored.current = true;
    try {
      const raw = localStorage.getItem(
        draftKey(boardKey, mode, initial?.postId),
      );
      if (!raw) return;
      const draft = JSON.parse(raw) as DraftPayload;
      if (!draft || typeof draft !== "object") return;
      if (draft.title) setTitle(draft.title);
      if (draft.content) setContent(draft.content);
      if (draft.category) setCategory(draft.category || NONE);
      if (draft.startsAt) setStartsAt(draft.startsAt);
      if (draft.endsAt) setEndsAt(draft.endsAt);
      if (typeof draft.smsSenderPhone === "string") {
        setSmsSender(draft.smsSenderPhone);
      }
      if (typeof draft.sendContactNotify === "boolean") {
        setSendSms(draft.sendContactNotify);
      }
      setDraftHint("임시저장된 내용을 불러왔습니다.");
    } catch {
      /* ignore */
    }
  }, [boardKey, mode, initial?.postId]);

  // 디바운스 임시저장
  useEffect(() => {
    if (typeof window === "undefined") return;
    const t = window.setTimeout(() => {
      const payload: DraftPayload = {
        title,
        content,
        category,
        startsAt,
        endsAt,
        smsSenderPhone: smsSender,
        sendContactNotify: sendSms,
        savedAt: Date.now(),
      };
      const hasText =
        title.trim().length > 0 ||
        content.replace(/<[^>]*>/g, "").trim().length > 0;
      if (!hasText) return;
      try {
        localStorage.setItem(
          draftKey(boardKey, mode, initial?.postId),
          JSON.stringify(payload),
        );
        setDraftHint("임시저장됨");
      } catch {
        /* ignore quota */
      }
    }, 800);
    return () => window.clearTimeout(t);
  }, [
    title,
    content,
    category,
    startsAt,
    endsAt,
    smsSender,
    sendSms,
    boardKey,
    mode,
    initial?.postId,
  ]);

  // 등록 성공 시 redirect 전에 임시저장 삭제 — redirect 시 이 컴포넌트 unmount
  // 오류 시에는 유지. 제출 직전 clear는 form wrapper에서.
  function clearDraft() {
    try {
      localStorage.removeItem(draftKey(boardKey, mode, initial?.postId));
    } catch {
      /* ignore */
    }
  }

  function toggleRemove(id: string) {
    setRemoveIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <form
      action={async (fd) => {
        try {
          await formAction(fd);
          // redirect 성공 시 여기까지 오지 않음. 오류 시 state.error 유지되며 draft 보존.
        } catch (e) {
          clearDraft();
          throw e;
        }
      }}
      className="space-y-5"
    >
      {mode === "create" ? (
        <input type="hidden" name="boardKey" value={boardKey} />
      ) : (
        <input type="hidden" name="postId" value={initial?.postId} />
      )}
      <input type="hidden" name="content" value={content} />
      <input
        type="hidden"
        name="category"
        value={category === NONE ? "" : category}
      />
      {[...removeIds].map((id) => (
        <input key={id} type="hidden" name="removeAttachmentIds" value={id} />
      ))}

      {draftHint && (
        <p className="text-xs text-muted-foreground">{draftHint}</p>
      )}

      <div className="space-y-2">
        <Label htmlFor="title">제목</Label>
        <Input
          id="title"
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="제목을 입력하세요"
          required
        />
      </div>

      {categories.length > 0 && (
        <div className="space-y-2">
          <Label>카테고리</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue placeholder="카테고리 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>선택 안 함</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {boardKey === "schedule" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="startsAt">시작</Label>
            <Input
              id="startsAt"
              name="startsAt"
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="endsAt">종료</Label>
            <Input
              id="endsAt"
              name="endsAt"
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
            />
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label>내용</Label>
        <RichTextEditor value={content} onChange={setContent} />
      </div>

      {mode === "edit" && initial && initial.attachments.length > 0 && (
        <div className="space-y-2">
          <Label className="flex items-center gap-1">
            <Paperclip className="h-4 w-4" />
            기존 첨부
          </Label>
          <ul className="space-y-1 rounded-md border p-2">
            {initial.attachments.map((a) => {
              const marked = removeIds.has(a.id);
              return (
                <li key={a.id} className="flex items-center gap-2 text-sm">
                  <span
                    className={
                      marked
                        ? "flex-1 truncate text-muted-foreground line-through"
                        : "flex-1 truncate"
                    }
                  >
                    {a.filename}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatFileSize(a.size)}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleRemove(a.id)}
                  >
                    {marked ? "취소" : <X className="h-4 w-4" />}
                  </Button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="files">
          첨부파일 추가{" "}
          <span className="text-xs font-normal text-muted-foreground">
            (최대 {MAX_FILES}개, 개당 10MB)
          </span>
        </Label>
        <Input id="files" name="files" type="file" multiple />
      </div>

      {mode === "create" && boardKey === "notices" && (
        <div className="space-y-3 rounded-lg border border-amber-200/80 bg-amber-50/60 px-3 py-3 text-sm dark:border-amber-900 dark:bg-amber-950/30">
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              name="sendContactNotify"
              className="mt-1"
              checked={sendSms}
              onChange={(e) => setSendSms(e.target.checked)}
            />
            <span>
              <span className="font-medium">등록과 동시에 휴대폰 알림 발송</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                회원가입 시 등록한 전화번호로 공지 제목·내용을 발송합니다.
                등록 후에도 글 상세에서 다시 발송할 수 있습니다.
              </span>
            </span>
          </label>
          <div className="space-y-1.5 pl-6">
            <Label htmlFor="smsSenderPhone" className="text-xs">
              발신 번호 (공란 시 내 휴대폰)
            </Label>
            <Input
              id="smsSenderPhone"
              name="smsSenderPhone"
              value={smsSender}
              onChange={(e) => setSmsSender(e.target.value)}
              placeholder={authorPhone || "010-0000-0000"}
              className="max-w-xs"
            />
          </div>
        </div>
      )}

      {state.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            clearDraft();
            setTitle(initial?.title ?? "");
            setContent(initial?.content ?? "");
            setCategory(initial?.category ?? NONE);
            setDraftHint("임시저장을 삭제했습니다.");
            toast.message("임시저장을 비웠습니다.");
          }}
        >
          임시저장 삭제
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {mode === "create" ? "등록" : "수정 완료"}
        </Button>
      </div>
    </form>
  );
}
