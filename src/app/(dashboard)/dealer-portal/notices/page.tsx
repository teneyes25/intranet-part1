import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireRole } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "공지사항",
};

const NOTICES = [
  { id: 1, title: "6월 정산 일정 안내", date: "2026-06-10" },
  { id: 2, title: "신규 프로모션 자료 배포", date: "2026-06-08" },
];

export default async function DealerNoticesPage() {
  await requireRole(["DEALER", "ADMIN"]);

  return (
    <div>
      <PageHeader
        title="공지사항"
        description="본사에서 대리점으로 전달하는 공지입니다."
      />
      <Card>
        <CardHeader>
          <CardTitle>최근 공지</CardTitle>
        </CardHeader>
        <CardContent className="divide-y text-sm">
          {NOTICES.map((n) => (
            <div
              key={n.id}
              className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
            >
              <span className="font-medium">{n.title}</span>
              <span className="text-xs text-muted-foreground">{n.date}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
