"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";

import { Badge } from "@/components/ui/badge";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  createdAt: string;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "방금";
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

/** 사이드바용 새 알림 패널 — 확인(읽음)한 항목은 숨김 */
export function SidebarNotifications({
  collapsed = false,
  onNavigate,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?unreadOnly=1");
      if (!res.ok) return;
      const data = await res.json();
      setItems((data.items ?? []).slice(0, 5));
      setUnread(data.unread ?? 0);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void fetchNotifications();
    const id = setInterval(() => void fetchNotifications(), 45_000);
    return () => clearInterval(id);
  }, [fetchNotifications]);

  async function markRead(id: string) {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setItems((prev) => prev.filter((n) => n.id !== id));
    setUnread((u) => Math.max(0, u - 1));
  }

  if (collapsed) {
    return (
      <div className="flex justify-center px-2 pb-2">
        <Link
          href="/notifications"
          onClick={onNavigate}
          className="relative flex h-10 w-10 items-center justify-center rounded-lg text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          aria-label={`알림 ${unread}건`}
          title="알림"
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-destructive" />
          )}
        </Link>
      </div>
    );
  }

  return (
    <div className="border-b border-sidebar-border px-3 pb-3">
      <div className="mb-2 flex items-center justify-between px-1">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-sidebar-foreground/35">
          <Bell className="h-3 w-3" />
          새 알림
        </p>
        {unread > 0 && (
          <Badge
            variant="secondary"
            className="h-5 min-w-5 justify-center bg-destructive/90 px-1.5 text-[10px] text-destructive-foreground"
          >
            {unread > 99 ? "99+" : unread}
          </Badge>
        )}
      </div>
      {items.length === 0 ? (
        <p className="px-1 py-2 text-xs text-sidebar-foreground/40">
          새 알림이 없습니다
        </p>
      ) : (
        <ul className="space-y-1">
          {items.map((n) => {
            const inner = (
              <>
                <span className="line-clamp-1 text-xs font-semibold text-sidebar-foreground">
                  {n.title}
                </span>
                {n.body && (
                  <span className="line-clamp-1 text-[10px] text-sidebar-foreground/45">
                    {n.body}
                  </span>
                )}
                <span className="text-[10px] text-sidebar-foreground/35">
                  {timeAgo(n.createdAt)}
                </span>
              </>
            );
            const className =
              "flex w-full flex-col rounded-md bg-sidebar-accent/50 px-2 py-1.5 text-left transition-colors hover:bg-sidebar-accent";
            return (
              <li key={n.id}>
                {n.link ? (
                  <Link
                    href={n.link}
                    className={className}
                    onClick={() => {
                      void markRead(n.id);
                      onNavigate?.();
                    }}
                  >
                    {inner}
                  </Link>
                ) : (
                  <button
                    type="button"
                    className={className}
                    onClick={() => {
                      void markRead(n.id);
                    }}
                  >
                    {inner}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <Link
        href="/notifications"
        onClick={onNavigate}
        className="mt-2 block px-1 text-[11px] text-sidebar-primary hover:underline"
      >
        알림 전체 보기
      </Link>
    </div>
  );
}
