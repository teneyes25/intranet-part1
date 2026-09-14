"use client";

import { FilePlus2 } from "lucide-react";

import { Button } from "@/components/ui/button";

export function NewApprovalPopupButton() {
  function open() {
    const w = 1100;
    const h = 960;
    const left = Math.max(0, Math.round((window.screen.width - w) / 2));
    const top = Math.max(0, Math.round((window.screen.height - h) / 2));
    window.open(
      "/approval/new",
      "approval-new",
      `width=${w},height=${h},left=${left},top=${top},scrollbars=yes,resizable=yes`,
    );
  }

  return (
    <Button type="button" onClick={open}>
      <FilePlus2 className="h-4 w-4" />
      새 기안
    </Button>
  );
}
