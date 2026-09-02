"use client";

import { useState, useTransition } from "react";
import { Loader2, Smartphone } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sendNoticeSmsAction } from "@/features/board/notice-sms-actions";
import { formatPhoneDisplay } from "@/lib/phone";

export function NoticeSmsPanel({
  postId,
  authorPhone,
  defaultOpen = false,
}: {
  postId: string;
  authorPhone?: string | null;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [sender, setSender] = useState(
    authorPhone ? formatPhoneDisplay(authorPhone) : "",
  );
  const [pending, start] = useTransition();

  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Smartphone className="h-4 w-4" />
        휴대폰 알림 발송
      </Button>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-amber-200/80 bg-amber-50/50 p-4 dark:border-amber-900 dark:bg-amber-950/20">
      <p className="text-sm font-medium">공지 휴대폰 알림 발송</p>
      <p className="text-xs text-muted-foreground">
        회원가입 시 등록한 전화번호로 공지 제목·내용을 발송합니다. 발신 번호를
        비우면 작성자 휴대폰이 사용됩니다.
      </p>
      <div className="space-y-1.5">
        <Label htmlFor="smsSenderPhone">발신 번호</Label>
        <Input
          id="smsSenderPhone"
          value={sender}
          onChange={(e) => setSender(e.target.value)}
          placeholder={authorPhone ? formatPhoneDisplay(authorPhone) : "010-0000-0000"}
          className="max-w-xs"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const fd = new FormData();
              fd.set("postId", postId);
              fd.set("smsSenderPhone", sender);
              const r = await sendNoticeSmsAction(fd);
              if (r.error) {
                toast.error(r.error);
                return;
              }
              toast.success(
                `발송 완료 (성공 ${r.contactSent ?? 0} · 실패 ${r.contactFailed ?? 0} · 번호없음 ${r.skippedNoPhone ?? 0})`,
              );
              setOpen(false);
            })
          }
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          발송하기
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          닫기
        </Button>
      </div>
    </div>
  );
}
