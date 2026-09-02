import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { getApproverCandidates } from "@/features/approval/queries";
import {
  buildLeaveDraftHtml,
  resolveLeaveApprovers,
} from "@/features/leave/approval-bridge";
import {
  currentLeaveYear,
  ensureLeaveBalance,
  remainingDays,
} from "@/features/leave/queries";
import { LeaveDraftComposer } from "@/features/leave/components/leave-draft-composer";

export const metadata: Metadata = { title: "연차 기안 신청" };

export default async function LeaveApplyPage() {
  const sessionUser = await requireUser();
  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: {
      id: true,
      name: true,
      phone: true,
      role: true,
      dealer: { select: { name: true } },
      jobs: { include: { jobCategory: { select: { name: true } } } },
    },
  });
  if (!user) return null;

  const year = currentLeaveYear();
  const balance = await ensureLeaveBalance(user.id, year);
  const remaining = remainingDays(balance.accruedDays, balance.usedDays);
  const affiliation = user.dealer?.name ?? "본사";
  const jobTitles = user.jobs.map((j) => j.jobCategory.name).join(", ");

  const today = new Date();
  const defaultContent = buildLeaveDraftHtml({
    affiliation,
    name: user.name,
    jobTitles,
    remainingDays: remaining,
    leaveType: "FULL",
    startDate: today,
    endDate: today,
    days: 1,
    reason: "",
    emergencyContact: user.phone ?? "",
  });

  let defaultApprovers: { approverId: string; title: string }[] = [];
  try {
    const resolved = await resolveLeaveApprovers(user.id);
    defaultApprovers = resolved.map((a) => ({
      approverId: a.id,
      title: a.title,
    }));
  } catch {
    defaultApprovers = [];
  }

  const candidatesRaw = await getApproverCandidates(user.id);
  const candidates = candidatesRaw.map((c) => ({
    id: c.id,
    name: c.name,
    role: c.role,
    dealerName: c.dealer?.name ?? null,
  }));

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 sm:p-6">
      <PageHeader
        title="연차 유급휴가 사용신청서"
        description="기안문 내용을 직접 수정하고, 결재선을 지정한 뒤 상신하세요. 결재선을 비우면 기본(신청자→인사→이사)이 적용됩니다."
      />
      <Card>
        <CardContent className="pt-6">
          <LeaveDraftComposer
            defaultPhone={user.phone}
            defaultContent={defaultContent}
            defaultApprovers={defaultApprovers}
            candidates={candidates}
            remainingDays={remaining}
            affiliation={affiliation}
            userName={user.name}
            jobTitles={jobTitles}
          />
        </CardContent>
      </Card>
    </div>
  );
}
