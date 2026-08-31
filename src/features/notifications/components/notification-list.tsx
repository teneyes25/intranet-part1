"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { markNotificationReadAction } from "@/features/notifications/actions";

type Item = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  createdAt: Date;
};

export function NotificationList({ items }: { items: Item[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <div className="overflow-hidden rounded-xl border">
      {items.length === 0 ? (
        <p className="p-8 text-center text-sm text-muted-foreground">
          알림이 없습니다.
        </p>
      ) : (
        <ul className="divide-y">
          {items.map((n) => {
            const href = n.link || "/notifications";
            return (
              <li key={n.id}>
                <Link
                  href={href}
                  className="flex items-start gap-3 px-4 py-4 transition-colors hover:bg-muted/40"
                  onClick={(e) => {
                    if (n.read) return;
                    e.preventDefault();
                    start(async () => {
                      await markNotificationReadAction(n.id);
                      router.push(href);
                      router.refresh();
                    });
                  }}
                  aria-disabled={pending}
                >
                  {!n.read && (
                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-sm ${n.read ? "text-muted-foreground" : "font-semibold"}`}
                      >
                        {n.title}
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        {n.type}
                      </Badge>
                      {n.read && (
                        <Badge variant="secondary" className="text-[10px]">
                          확인됨
                        </Badge>
                      )}
                    </div>
                    {n.body && (
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {n.body}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Intl.DateTimeFormat("ko-KR", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(n.createdAt)}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
