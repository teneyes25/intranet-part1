"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Bell, CheckCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useFirebase } from "@/features/firebase/components/firebase-provider";
import { useFirestoreNotifications } from "@/features/firebase/hooks/use-firestore-notifications";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";

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

export function NotificationBell() {
  const { data: session } = useSession();
  const { flags } = useFirebase();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const onFirestoreUpdate = useCallback(
    (firestoreItems: { id: string; type: string; title: string; body: string | null; link: string | null; read: boolean; createdAt: string }[], count: number) => {
      setItems(
        firestoreItems.map((n) => ({
          id: n.id,
          type: n.type,
          title: n.title,
          body: n.body,
          link: n.link,
          read: n.read,
          createdAt: n.createdAt,
        })),
      );
      setUnread(count);
      setLoading(false);
    },
    [],
  );

  useFirestoreNotifications({
    userId: session?.user?.id,
    enabled: flags.firestore,
    onUpdate: onFirestoreUpdate,
  });

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      setItems(data.items ?? []);
      setUnread(data.unread ?? 0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (flags.firestore) return;
    fetchNotifications();
    const id = setInterval(fetchNotifications, 30_000);
    function onVisible() {
      if (document.visibilityState === "visible") void fetchNotifications();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [fetchNotifications, flags.firestore]);

  useEffect(() => {
    if (!flags.firestore) return;
    fetchNotifications();
  }, [flags.firestore, fetchNotifications]);

  async function markRead(id: string) {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
    setUnread((u) => Math.max(0, u - 1));
  }

  async function markAllRead() {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnread(0);
    toast.success("모든 알림을 읽음 처리했습니다.");
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative touch-target"
          aria-label={`알림 ${unread}건`}
        >
          <Bell className="h-5 w-5 text-muted-foreground" />
          {unread > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground shadow-soft ring-2 ring-card">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[min(100vw-2rem,22rem)] p-0 shadow-elevated">
        <DropdownMenuLabel className="flex items-center justify-between px-3 py-3">
          <span className="text-sm font-semibold">알림</span>
          <div className="flex items-center gap-1.5">
            {unread > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                {unread}
              </Badge>
            )}
            {unread > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                aria-label="모두 읽음"
                onClick={(e) => {
                  e.preventDefault();
                  void markAllRead();
                }}
              >
                <CheckCheck className="h-4 w-4" />
              </Button>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="m-0" />
        <div className="max-h-[min(60vh,22rem)] overflow-y-auto p-1.5">
          {loading ? (
            <div className="space-y-2 p-2">
              <Skeleton className="h-14 w-full rounded-lg" />
              <Skeleton className="h-14 w-full rounded-lg" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-3 py-10 text-center">
              <Bell className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">새 알림이 없습니다.</p>
            </div>
          ) : (
            items.map((n) => (
              <DropdownMenuItem
                key={n.id}
                className="cursor-pointer p-0 focus:bg-transparent"
                onClick={() => {
                  if (!n.read) void markRead(n.id);
                  setOpen(false);
                }}
                asChild={!!n.link}
              >
                {n.link ? (
                  <Link
                    href={n.link}
                    className={`notif-item ${n.read ? "" : "notif-item-unread"}`}
                  >
                    <span className={`text-sm ${n.read ? "font-normal" : "font-semibold"}`}>
                      {n.title}
                    </span>
                    {n.body && (
                      <span className="line-clamp-2 text-xs text-muted-foreground">{n.body}</span>
                    )}
                    <span className="text-[11px] text-muted-foreground/70">
                      {timeAgo(n.createdAt)}
                    </span>
                  </Link>
                ) : (
                  <div className={`notif-item ${n.read ? "" : "notif-item-unread"}`}>
                    <span className={`text-sm ${n.read ? "font-normal" : "font-semibold"}`}>
                      {n.title}
                    </span>
                    {n.body && (
                      <span className="line-clamp-2 text-xs text-muted-foreground">{n.body}</span>
                    )}
                    <span className="text-[11px] text-muted-foreground/70">
                      {timeAgo(n.createdAt)}
                    </span>
                  </div>
                )}
              </DropdownMenuItem>
            ))
          )}
        </div>
        <DropdownMenuSeparator className="m-0" />
        <DropdownMenuItem asChild className="justify-center rounded-none py-3 text-sm font-medium text-primary">
          <Link href="/notifications">모든 알림 보기</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
