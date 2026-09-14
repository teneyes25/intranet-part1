"use client";

import { Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";

export function EditApprovalPopupButton({ id }: { id: string }) {
  function open() {
    const w = 1100;
    const h = 960;
    const left = Math.max(0, Math.round((window.screen.width - w) / 2));
    const top = Math.max(0, Math.round((window.screen.height - h) / 2));
    window.open(
      `/approval/${id}/edit`,
      "approval-edit",
      `width=${w},height=${h},left=${left},top=${top},scrollbars=yes,resizable=yes`,
    );
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={open}>
      <Pencil className="h-4 w-4" />
      수정
    </Button>
  );
}
