"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { CheckCheck } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { NotificationType } from "@prisma/client";

const TYPE_LABEL: Partial<Record<NotificationType, string>> = {
  APPROVAL_REQUEST: "결재",
  APPROVAL_RESULT: "결재",
  NOTICE: "공지",
  COMMENT: "댓글",
  SYSTEM: "시스템",
  EMERGENCY: "긴급",
};

interface NotificationRow {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  createdAt: Date;
}

export function NotificationsList({ items: initial }: { items: NotificationRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  async function markRead(id: string) {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    startTransition(() => router.refresh());
  }

  async function markAllRead() {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    toast.success("모든 알림을 읽음 처리했습니다.");
    startTransition(() => router.refresh());
  }

  const unread = initial.filter((n) => !n.read).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          총 {initial.length}건
          {unread > 0 && (
            <>
              {" "}
              · 미읽음 <strong>{unread}</strong>건
            </>
          )}
        </p>
        {unread > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => void markAllRead()}
          >
            <CheckCheck className="h-4 w-4" />
            전체 읽음
          </Button>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border">
        {initial.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">알림이 없습니다.</p>
        ) : (
          <ul className="divide-y">
            {initial.map((n) => (
              <li key={n.id}>
                {n.link ? (
                  <Link
                    href={n.link}
                    onClick={() => {
                      if (!n.read) void markRead(n.id);
                    }}
                    className={`notif-item block ${n.read ? "" : "notif-item-unread"}`}
                  >
                    <NotificationContent n={n} />
                  </Link>
                ) : (
                  <button
                    type="button"
                    className={`notif-item w-full text-left ${n.read ? "" : "notif-item-unread"}`}
                    onClick={() => {
                      if (!n.read) void markRead(n.id);
                    }}
                  >
                    <NotificationContent n={n} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function NotificationContent({ n }: { n: NotificationRow }) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
        <span className={`text-sm ${n.read ? "" : "font-semibold"}`}>{n.title}</span>
        <Badge variant="outline" className="text-[10px]">
          {TYPE_LABEL[n.type] ?? n.type}
        </Badge>
      </div>
      {n.body && <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p>}
      <p className="mt-1 text-xs text-muted-foreground">
        {new Intl.DateTimeFormat("ko-KR", {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(new Date(n.createdAt))}
      </p>
    </>
  );
}
