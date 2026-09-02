"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { adminDeletePostAction } from "@/features/boards-admin/actions";

export function AdminDeletePostButton({
  boardKey,
  postId,
}: {
  boardKey: string;
  postId: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="text-destructive"
      disabled={pending}
      onClick={() => {
        if (!window.confirm("이 게시글을 삭제할까요?")) return;
        startTransition(async () => {
          try {
            await adminDeletePostAction(boardKey, postId);
            toast.success("게시글을 삭제했습니다.");
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "삭제에 실패했습니다.");
          }
        });
      }}
    >
      {pending ? "삭제 중…" : "삭제"}
    </Button>
  );
}
