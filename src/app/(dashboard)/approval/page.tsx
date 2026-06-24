import type { Metadata } from "next";
import Link from "next/link";
import { FilePlus2, Inbox, FileEdit, CheckCircle2, Hourglass } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatCard } from "@/features/dashboard/components/stat-card";
import { cn } from "@/lib/utils";
import { requireUser } from "@/lib/auth/session";
import { ApprovalList } from "@/features/approval/components/approval-list";
import {
  listInbox,
  listMyDrafts,
  listCompleted,
  getBoxCounts,
} from "@/features/approval/queries";

export const metadata: Metadata = { title: "전자결재" };

type Box = "inbox" | "drafts" | "completed";

const TABS: { key: Box; label: string; icon: typeof Inbox }[] = [
  { key: "inbox", label: "수신함", icon: Inbox },
  { key: "drafts", label: "기안함", icon: FileEdit },
  { key: "completed", label: "완료함", icon: CheckCircle2 },
];

export default async function ApprovalPage({
  searchParams,
}: {
  searchParams: Promise<{ box?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const box: Box =
    sp.box === "drafts" || sp.box === "completed" ? sp.box : "inbox";

  const counts = await getBoxCounts(user.id);

  type InboxItem = Awaited<ReturnType<typeof listInbox>>[number];
  type DocItem = Awaited<ReturnType<typeof listMyDrafts>>[number];
  let items: (InboxItem | DocItem)[];
  let emptyText: string;
  if (box === "drafts") {
    items = await listMyDrafts(user.id);
    emptyText = "기안한 문서가 없습니다. ‘새 기안’으로 작성해 보세요.";
  } else if (box === "completed") {
    items = await listCompleted(user.id);
    emptyText = "완료 또는 반려된 문서가 없습니다.";
  } else {
    items = await listInbox(user.id);
    emptyText = "수신한 결재 문서가 없습니다.";
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-2">
        <PageHeader
          title="전자결재"
          description="기안서를 작성·상신하고 결재선에 따라 검토·승인합니다."
        />
        <Button asChild>
          <Link href="/approval/new">
            <FilePlus2 className="h-4 w-4" />
            새 기안
          </Link>
        </Button>
      </div>

      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <StatCard
          title="결재 대기"
          value={`${counts.myTurn}건`}
          hint="내 차례"
          icon={Hourglass}
        />
        <StatCard
          title="진행 중 기안"
          value={`${counts.draftsInProgress}건`}
          icon={FileEdit}
        />
        <StatCard
          title="완료/반려"
          value={`${counts.completed}건`}
          icon={CheckCircle2}
        />
      </div>

      {/* 탭 */}
      <div className="mb-3 flex gap-1 border-b">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = t.key === box;
          const badge =
            t.key === "inbox"
              ? counts.inbox
              : t.key === "completed"
                ? counts.completed
                : undefined;
          return (
            <Link
              key={t.key}
              href={`/approval?box=${t.key}`}
              className={cn(
                "flex items-center gap-1.5 border-b-2 px-4 py-2 text-sm font-medium transition-colors",
                active
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {t.label}
              {badge !== undefined && badge > 0 && (
                <span className="ml-0.5 rounded-full bg-muted px-1.5 text-xs">
                  {badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      <Card>
        <CardContent className="p-0">
          <ApprovalList items={items} emptyText={emptyText} />
        </CardContent>
      </Card>
    </div>
  );
}
