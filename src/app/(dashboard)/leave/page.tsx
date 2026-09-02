import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, CheckCircle2, Clock3 } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/features/dashboard/components/stat-card";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { isHrStaff } from "@/features/jobs/service";
import {
  getMyLeaveSummary,
  listLeaveBalancesForHr,
  listLeaveUsageHistory,
  listPendingLeaveRequests,
} from "@/features/leave/queries";
import {
  HrAccrualTable,
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

const TYPE_LABEL: Record<string, string> = {
  FULL: "연차",
  HALF: "반차",
};

export default async function LeavePage() {
  const user = await requireUser();
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { phone: true },
  });
  const summary = await getMyLeaveSummary(user.id);
  const hr = user.role === "ADMIN" || (await isHrStaff(user.id));
  const pendingAll = hr ? await listPendingLeaveRequests() : [];
  const hrBalances = hr ? await listLeaveBalancesForHr(summary.year) : [];
  const usageHistory = hr
    ? await listLeaveUsageHistory({ take: 80 })
    : summary.requests;

  return (
    <div className="space-y-6">
      <PageHeader
        title="연차관리"
        description="발생·사용 연차 확인, 기안문 기반 사용 신청, 인사 담당자의 발생 연차 입력. 결재 완료 시 잔여 연차에서 차감됩니다."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="발생 연차"
          value={`${summary.accruedDays}일`}
          hint={
            summary.accruedAt
              ? `${summary.year}년 · 발생 ${formatDate(summary.accruedAt)}`
              : `${summary.year}년`
          }
          icon={CalendarDays}
        />
        <StatCard
          title="사용 연차"
          value={`${summary.usedDays}일`}
          hint="결재 승인 기준"
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
            <CardTitle className="text-base">연차 사용 신청 (기안문)</CardTitle>
          </CardHeader>
          <CardContent>
            <LeaveRequestForm defaultPhone={dbUser?.phone} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">내 사용 내역</CardTitle>
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
                    <Badge variant="outline">
                      {TYPE_LABEL[r.leaveType] ?? r.leaveType}
                    </Badge>
                    <span className="font-medium">
                      {formatDate(r.startDate)}
                      {r.leaveType === "HALF"
                        ? ""
                        : ` ~ ${formatDate(r.endDate)}`}
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
                        approvalId={r.approvalDocumentId}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {hr && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                발생 연차 입력 ({summary.year}년) — 인사/관리자
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <HrAccrualTable year={summary.year} rows={hrBalances} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                결재 대기 ({pendingAll.length})
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
                      <Badge variant="outline">
                        {TYPE_LABEL[r.leaveType] ?? "연차"}
                      </Badge>
                      <span>
                        {formatDate(r.startDate)}
                        {r.leaveType === "HALF"
                          ? ""
                          : ` ~ ${formatDate(r.endDate)}`}{" "}
                        ({r.days}일)
                      </span>
                      {r.approvalDocumentId && (
                        <Link
                          className="text-xs text-primary underline"
                          href={`/approval/${r.approvalDocumentId}`}
                        >
                          기안문 결재
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">전체 연차 사용 내역</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {"length" in usageHistory && usageHistory.length === 0 ? (
                <p className="px-6 py-8 text-center text-sm text-muted-foreground">
                  사용 내역이 없습니다.
                </p>
              ) : (
                <ul className="divide-y">
                  {usageHistory.map((r) => {
                    const name =
                      "user" in r && r.user
                        ? r.user.name
                        : undefined;
                    return (
                      <li
                        key={r.id}
                        className="flex flex-wrap items-center gap-2 px-6 py-3 text-sm"
                      >
                        {name && (
                          <span className="font-medium">{name}</span>
                        )}
                        <Badge variant="outline">
                          {TYPE_LABEL[r.leaveType] ?? r.leaveType}
                        </Badge>
                        <span>
                          {formatDate(r.startDate)}
                          {r.leaveType === "HALF"
                            ? ""
                            : ` ~ ${formatDate(r.endDate)}`}
                        </span>
                        <span className="text-muted-foreground">
                          {r.days}일
                        </span>
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
                        {r.approvalDocumentId && (
                          <Link
                            className="ml-auto text-xs text-primary underline"
                            href={`/approval/${r.approvalDocumentId}`}
                          >
                            기안문
                          </Link>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
