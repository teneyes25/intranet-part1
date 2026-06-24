import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { listNotifications } from "@/features/notifications/service";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "알림",
};

export default async function NotificationsPage() {
  const user = await requireUser();
  const items = await listNotifications(user.id, 50);

  return (
    <div>
      <PageHeader title="알림" description="결재·공지·시스템 알림 목록" />
      <div className="overflow-hidden rounded-xl border">
        {items.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            알림이 없습니다.
          </p>
        ) : (
          <ul className="divide-y">
            {items.map((n) => (
              <li key={n.id}>
                <Link
                  href={n.link ?? "#"}
                  className="flex items-start gap-3 px-4 py-4 transition-colors hover:bg-muted/40"
                >
                  {!n.read && (
                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-sm ${n.read ? "" : "font-semibold"}`}>
                        {n.title}
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        {n.type}
                      </Badge>
                    </div>
                    {n.body && (
                      <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p>
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
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
