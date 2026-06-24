import type { Metadata } from "next";
import { ClipboardList, Package, Receipt } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatCard } from "@/features/dashboard/components/stat-card";
import { requireRole } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "대리점 포털",
};

export default async function DealerPortalPage() {
  const user = await requireRole(["DEALER", "ADMIN"]);

  return (
    <div>
      <PageHeader
        title="대리점 포털"
        description={
          user.dealerName
            ? `${user.dealerName} 워크스페이스입니다.`
            : "대리점 전용 업무 공간입니다. (DEALER, ADMIN)"
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard title="이번 달 주문" value="24" hint="처리 대기 3건" icon={Package} />
        <StatCard title="미정산 금액" value="₩1.2M" hint="이번 주" icon={Receipt} />
        <StatCard title="신규 공지" value="2" hint="확인 필요" icon={ClipboardList} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>내 대리점 정보</CardTitle>
          <CardDescription>
            로그인한 계정에 연결된 대리점 정보입니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between border-b pb-2">
            <span className="text-muted-foreground">대리점명</span>
            <span className="font-medium">{user.dealerName ?? "-"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">대리점 ID</span>
            <span className="font-mono text-xs">{user.dealerId ?? "-"}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
