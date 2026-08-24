import type { Metadata } from "next";
import { CalendarDays, CheckCircle2, Clock3 } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/features/dashboard/components/stat-card";
import { requireUser } from "@/lib/auth/session";
import { hasMinRole } from "@/lib/auth/roles";
import {
  getMyLeaveSummary,
  listPendingLeaveRequests,
} from "@/features/leave/queries";
import {
  LeaveRequestActions,
  LeaveRequestForm,
} from "@/features/leave/components/leave-forms";
import { formatDate } from "@/features/board/utils";

export const metadata: Metadata = { title: "연차관리" };

const STATUS_LABEL: Record<string, string> = {
  PENDING: "대기",
  APPROVED: "승인",
  REJECTED: "반려",
  CANCELLED: "취소",
};

export default async function LeavePage() {
  const user = await requireUser();
  const summary = await getMyLeaveSummary(user.id);
  const canReview = hasMinRole(user.role, "HEADQUARTER");
  const pendingAll = canReview ? await listPendingLeaveRequests() : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="연차관리"
        description="본인 발생·사용 연차를 확인하고 사용 신청·승인을 진행합니다. 매월 말일 잔여 연차가 가입 이메일로 안내됩니다."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="발생 연차"
          value={`${summary.accruedDays}일`}
          hint={`${summary.year}년`}
          icon={CalendarDays}
        />
        <StatCard
          title="사용 연차"
          value={`${summary.usedDays}일`}
          hint="승인 완료 기준"
          icon={CheckCircle2}
        />
        <StatCard
          title="잔여 연차"
          value={`${summary.remainingDays}일`}
          hint="신청 가능"
          icon={Clock3}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">연차 사용 신청</CardTitle>
          </CardHeader>
          <CardContent>
            <LeaveRequestForm />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">내 신청 내역</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {summary.requests.length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-muted-foreground">
                신청 내역이 없습니다.
              </p>
            ) : (
              <ul className="divide-y">
                {summary.requests.map((r) => (
                  <li
                    key={r.id}
                    className="flex flex-wrap items-center gap-2 px-6 py-3 text-sm"
                  >
                    <span className="font-medium">
                      {formatDate(r.startDate)} ~ {formatDate(r.endDate)}
                    </span>
                    <span className="text-muted-foreground">{r.days}일</span>
                    <Badge
                      variant={
                        r.status === "APPROVED"
                          ? "success"
                          : r.status === "REJECTED"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {STATUS_LABEL[r.status] ?? r.status}
                    </Badge>
                    {r.reason && (
                      <span className="w-full text-xs text-muted-foreground sm:w-auto">
                        {r.reason}
                      </span>
                    )}
                    <div className="ml-auto">
                      <LeaveRequestActions
                        requestId={r.id}
                        canCancel={r.status === "PENDING"}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {canReview && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              승인 대기 ({pendingAll.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {pendingAll.length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-muted-foreground">
                대기 중인 신청이 없습니다.
              </p>
            ) : (
              <ul className="divide-y">
                {pendingAll.map((r) => (
                  <li
                    key={r.id}
                    className="flex flex-wrap items-center gap-2 px-6 py-3 text-sm"
                  >
                    <span className="font-medium">{r.user.name}</span>
                    <span className="text-muted-foreground">{r.user.email}</span>
                    <span>
                      {formatDate(r.startDate)} ~ {formatDate(r.endDate)} (
                      {r.days}일)
                    </span>
                    {r.reason && (
                      <span className="text-xs text-muted-foreground">
                        {r.reason}
                      </span>
                    )}
                    <div className="ml-auto">
                      <LeaveRequestActions
                        requestId={r.id}
                        canReview={r.userId !== user.id}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
