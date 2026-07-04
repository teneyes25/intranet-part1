"use client";

import { useTransition } from "react";
import { FolderInput } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SYSTEM_FOLDERS } from "@/features/board-mailbox/constants";
import { movePostDragAction } from "@/features/board-mailbox/actions";
import type { CustomFolder } from "@/features/board-mailbox/types";

interface MobileFolderMoveProps {
  boardKey: string;
  postId: string;
  customFolders: CustomFolder[];
}

export function MobileFolderMove({
  boardKey,
  postId,
  customFolders,
}: MobileFolderMoveProps) {
  const [pending, startTransition] = useTransition();

  function moveTo(targetKey: string | null) {
    startTransition(async () => {
      const r = await movePostDragAction(boardKey, postId, targetKey);
      if (r.error) toast.error(r.error);
      else toast.success("폴더로 이동했습니다.");
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="mr-1 h-9 w-9 shrink-0 md:hidden"
          disabled={pending}
          aria-label="폴더로 이동"
        >
          <FolderInput className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>폴더로 이동</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {SYSTEM_FOLDERS.map((f) => (
          <DropdownMenuItem key={f.key} onClick={() => moveTo(f.key)}>
            {f.name}
          </DropdownMenuItem>
        ))}
        {customFolders.length > 0 && (
          <>
            <DropdownMenuSeparator />
            {customFolders.map((f) => (
              <DropdownMenuItem key={f.id} onClick={() => moveTo(f.id)}>
                {f.name}
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
