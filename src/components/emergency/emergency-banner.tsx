"use client";

import { AlertTriangle, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";

interface EmergencyBannerProps {
  title: string;
  body: string;
  noticeId: string;
  isAdmin: boolean;
}

export function EmergencyBanner({ title, body, noticeId, isAdmin }: EmergencyBannerProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (isAdmin) {
    return (
      <div className="mb-4 flex items-start gap-3 rounded-lg border border-red-500/40 bg-red-500/10 p-4">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-red-800 dark:text-red-200">{title}</p>
          <p className="mt-1 text-sm text-red-900/90 dark:text-red-100/90">{body}</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await fetch("/api/admin/emergency/deactivate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ noticeId }),
              });
              router.refresh();
            })
          }
        >
          <X className="h-3 w-3" />
          해제
        </Button>
      </div>
    );
  }

  return (
    <div className="mb-4 flex items-start gap-3 rounded-lg border border-red-500/40 bg-red-500/10 p-4">
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
      <div>
        <p className="font-semibold text-red-800 dark:text-red-200">{title}</p>
        <p className="mt-1 text-sm text-red-900/90 dark:text-red-100/90">{body}</p>
      </div>
    </div>
  );
}
