"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { bulkDeletePostsListAction } from "@/features/board/bulk-actions";

export function AnabadaPostActions({
  boardKey,
  postId,
  canManage,
}: {
  boardKey: string;
  postId: string;
  canManage: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (!canManage) return null;

  function handleDelete() {
    if (!confirm("이 게시글을 삭제할까요?")) return;
    startTransition(async () => {
      const r = await bulkDeletePostsListAction(boardKey, [postId]);
      if (r.error) toast.error(r.error);
      else {
        toast.success("삭제되었습니다.");
        router.refresh();
      }
    });
  }

  return (
    <div className="flex gap-1">
      <Button
        asChild
        type="button"
        variant="secondary"
        size="icon"
        className="h-8 w-8 touch-target-sm"
      >
        <Link href={`/boards/${boardKey}/${postId}/edit`} aria-label="수정">
          <Pencil className="h-3.5 w-3.5" />
        </Link>
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="icon"
        className="h-8 w-8 touch-target-sm"
        disabled={pending}
        onClick={handleDelete}
        aria-label="삭제"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
