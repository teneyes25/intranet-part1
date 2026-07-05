"use client";

import { useActionState, useState } from "react";
import { Loader2, Paperclip, X } from "lucide-react";

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
import { formatFileSize } from "@/features/board/utils";
import { ANABADA_SALE_STATUSES } from "@/features/board/board-search-utils";
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
  initial?: {
    postId: string;
    title: string;
    content: string;
    category: string | null;
    price?: number | null;
    saleStatus?: string | null;
    attachments: ExistingAttachment[];
  };
}

const NONE = "__none__";
const initialState: ActionState = { error: null };

export function PostForm({ mode, boardKey, categories, initial }: PostFormProps) {
  const action = mode === "create" ? createPostAction : updatePostAction;
  const [state, formAction, isPending] = useActionState(action, initialState);

  const [content, setContent] = useState(initial?.content ?? "");
  const [category, setCategory] = useState(initial?.category ?? NONE);
  const [saleStatus, setSaleStatus] = useState(initial?.saleStatus ?? "selling");
  const [removeIds, setRemoveIds] = useState<Set<string>>(new Set());
  const isAnabada = boardKey === "anabada";

  function toggleRemove(id: string) {
    setRemoveIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <form action={formAction} className="space-y-5">
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
      {isAnabada && (
        <input type="hidden" name="saleStatus" value={saleStatus} />
      )}
      {[...removeIds].map((id) => (
        <input key={id} type="hidden" name="removeAttachmentIds" value={id} />
      ))}

      <div className="space-y-2">
        <Label htmlFor="title">제목</Label>
        <Input
          id="title"
          name="title"
          defaultValue={initial?.title}
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

      {isAnabada && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="price">가격 (원)</Label>
            <Input
              id="price"
              name="price"
              type="number"
              min={0}
              defaultValue={initial?.price ?? ""}
              placeholder="0 = 나눔"
            />
          </div>
          <div className="space-y-2">
            <Label>판매 상태</Label>
            <Select value={saleStatus} onValueChange={setSaleStatus}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ANABADA_SALE_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label>내용</Label>
        <RichTextEditor value={content} onChange={setContent} />
      </div>

      {mode === "edit" && initial && initial.attachments.length > 0 && (
        <div className="space-y-2">
          <Label>기존 첨부파일</Label>
          <ul className="space-y-1">
            {initial.attachments.map((a) => {
              const marked = removeIds.has(a.id);
              return (
                <li
                  key={a.id}
                  className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
                >
                  <Paperclip className="h-4 w-4 text-muted-foreground" />
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
            (최대 {MAX_FILES}개, 개당 10MB{isAnabada ? " · 상품 사진 권장" : ""})
          </span>
        </Label>
        <Input id="files" name="files" type="file" multiple />
      </div>

      {state.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {mode === "create" ? "등록" : "수정 완료"}
        </Button>
      </div>
    </form>
  );
}
