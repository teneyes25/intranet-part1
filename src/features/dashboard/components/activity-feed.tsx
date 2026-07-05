import Link from "next/link";
import {
  Activity,
  Bell,
  Bot,
  FileCheck2,
  FileText,
  LogIn,
  Upload,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatRelativeTime } from "@/lib/format-relative";
import type { ActivityFeedItem } from "@/features/dashboard/queries";

function pickIcon(item: ActivityFeedItem) {
  if (item.kind === "post") return FileText;
  if (item.kind === "notification") return Bell;
  switch (item.actionKey) {
    case "AI_CHAT":
    case "AI_DRAFT":
      return Bot;
    case "APPROVAL_APPROVE":
    case "APPROVAL_REJECT":
    case "APPROVAL_SUBMIT":
      return FileCheck2;
    case "LOGIN_SUCCESS":
    case "LOGIN_FAILURE":
      return LogIn;
    case "FILE_UPLOAD":
      return Upload;
    default:
      return Activity;
  }
}

export function ActivityFeed({ items }: { items: ActivityFeedItem[] }) {
  return (
    <Card
      className="overflow-hidden shadow-card"
      data-testid="activity-feed"
      data-activity-feed
    >
      <CardHeader className="border-b border-border/50 bg-muted/20 pb-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-4 w-4 text-primary" />
          최근 활동
        </CardTitle>
        <CardDescription>알림·감사 로그·게시 활동을 한눈에 확인합니다.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {items.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="아직 표시할 활동이 없습니다"
            description="결재·게시·AI 사용 시 이곳에 타임라인이 쌓입니다."
            compact
          />
        ) : (
          <ul className="divide-y divide-border/60">
            {items.map((item) => {
              const Icon = pickIcon(item);
              const inner = (
                <>
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-snug">{item.sentence}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatRelativeTime(item.at)}
                    </p>
                  </div>
                </>
              );

              return (
                <li key={item.id}>
                  {item.href ? (
                    <Link
                      href={item.href}
                      className="flex gap-3 px-5 py-3.5 transition-colors hover:bg-primary/[0.04]"
                    >
                      {inner}
                    </Link>
                  ) : (
                    <div className="flex gap-3 px-5 py-3.5">{inner}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
