"use client";

import { useActionState, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { addCommentAction, type ActionState } from "@/features/board/actions";

const initialState: ActionState = { error: null };

export function CommentForm({ postId }: { postId: string }) {
  const [state, formAction, isPending] = useActionState(
    addCommentAction,
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-2" id={`comment-form-${postId}`}>
      <input type="hidden" name="postId" value={postId} />
      <Textarea
        name="content"
        placeholder="댓글을 입력하세요"
        required
        rows={3}
      />
      {state.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          댓글 등록
        </Button>
      </div>
    </form>
  );
}
