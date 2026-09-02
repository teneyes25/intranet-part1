"use client";

import { useEffect } from "react";
import { MessageSquare } from "lucide-react";

import { Button } from "@/components/ui/button";
import { openMessengerPopup } from "@/features/messenger/open-popup";

export function MessengerLaunchClient({ autoOpen = true }: { autoOpen?: boolean }) {
  useEffect(() => {
    if (autoOpen) openMessengerPopup();
  }, [autoOpen]);

  return (
    <div className="flex flex-col items-start gap-3">
      <p className="text-sm text-muted-foreground">
        사내 메신저는 카카오톡처럼 작은 새 창에서 대화합니다. 왼쪽 목록에서
        이름(직책/업무)으로 상대를 찾으세요.
      </p>
      <Button type="button" onClick={() => openMessengerPopup()}>
        <MessageSquare className="h-4 w-4" />
        메신저 창 열기
      </Button>
    </div>
  );
}
