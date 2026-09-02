import "server-only";

import type { LeaveType } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { findUsersByJobName } from "@/features/jobs/service";
import {
  calcLeaveDays,
  currentLeaveYear,
  remainingDays,
  syncLeaveUsedDaysFromApproved,
} from "@/features/leave/queries";
import { getDefaultApprovalDocumentCategoryId } from "@/features/documents/category-service";
import { sanitizeRichText, sanitizePlainText } from "@/lib/sanitize";
import { createNotification } from "@/features/notifications/service";

function fmtDate(d: Date) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function fmtDateTimeLocal(d: Date) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/** PDF 양식 기반 연차 기안문 HTML */
export function buildLeaveDraftHtml(params: {
  affiliation: string;
  name: string;
  jobTitles: string;
  remainingDays: number;
  leaveType: LeaveType;
  startDate: Date;
  endDate: Date;
  days: number;
  reason: string;
  emergencyContact: string;
}) {
  const typeLabel = params.leaveType === "HALF" ? "반차" : "연차";
  const applied = fmtDate(new Date());
  return sanitizeRichText(`
    <h1 style="text-align:center;letter-spacing:0.25em;margin-bottom:1.5rem;">연차 유급휴가 사용신청서</h1>
    <h2>1. 신청자 정보</h2>
    <table style="width:100%;border-collapse:collapse;" border="1" cellpadding="8">
      <tr><th style="width:18%;background:#f7f7f7;">소속</th><td style="width:32%;">${escape(params.affiliation)}</td><th style="width:18%;background:#f7f7f7;">성명</th><td>${escape(params.name)}</td></tr>
      <tr><th style="background:#f7f7f7;">직책(업무)</th><td>${escape(params.jobTitles || "-")}</td><th style="background:#f7f7f7;">잔여 연차 수</th><td>${params.remainingDays}일</td></tr>
    </table>
    <h2>2. 신청 내역</h2>
    <table style="width:100%;border-collapse:collapse;" border="1" cellpadding="8">
      <tr><th style="width:18%;background:#f7f7f7;">연차 종류</th><td style="width:32%;">${typeLabel}</td><th style="width:18%;background:#f7f7f7;">총 기간</th><td>${params.days}일</td></tr>
      <tr><th style="background:#f7f7f7;">시작 일시</th><td>${escape(fmtDateTimeLocal(params.startDate))}</td><th style="background:#f7f7f7;">종료 일시</th><td>${escape(fmtDateTimeLocal(params.endDate))}</td></tr>
      <tr><th style="background:#f7f7f7;">신청 사유</th><td colspan="3">${escape(params.reason || "-")}</td></tr>
      <tr><th style="background:#f7f7f7;">비상 연락처</th><td colspan="3">${escape(params.emergencyContact || "-")}</td></tr>
      <tr><th style="background:#f7f7f7;">신청일</th><td colspan="3">${escape(applied)}</td></tr>
      <tr><th style="background:#f7f7f7;">신청자</th><td colspan="3">${escape(params.name)}</td></tr>
    </table>
    <h2>3. 결재</h2>
    <table style="width:60%;margin-left:auto;border-collapse:collapse;text-align:center;" border="1" cellpadding="8">
      <tr>
        <th style="background:#f7f7f7;">담당</th>
        <th style="background:#f7f7f7;">인사</th>
        <th style="background:#f7f7f7;">이사</th>
      </tr>
      <tr>
        <td style="height:64px;">${escape(params.name)}</td>
        <td></td>
        <td></td>
      </tr>
    </table>
    <p style="margin-top:1rem;color:#666;font-size:0.9em;">결재선은 신청자 업무에 따라 자동 지정됩니다. (일반: 인사→이사 / 인사: 이사 / 이사: 대표이사)</p>
  `);
}

function escape(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * 기본 결재선: 인사담당자 → 이사
 * (신청자는 기안자. 결재선에 직접 지정하지 않으면 이 기본값 사용)
 */
export async function resolveLeaveApprovers(applicantId: string) {
  const hrList = await findUsersByJobName("인사");
  const directors = await findUsersByJobName("이사");

  const pick = (
    list: { id: string; name: string }[],
    title: string,
    excludeId?: string,
  ) => {
    const u = list.find((x) => x.id !== excludeId) ?? list[0];
    return u && u.id !== excludeId ? { ...u, title } : null;
  };

  const hr = pick(hrList, "인사담당자", applicantId);
  const dir = pick(directors, "이사", applicantId);
  const steps: { id: string; name: string; title: string }[] = [];
  if (hr) steps.push(hr);
  if (dir) steps.push(dir);
  if (steps.length === 0) {
    throw new Error(
      "기본 결재선(인사·이사)을 찾을 수 없습니다. 결재자를 직접 지정하거나 관리자에게 문의하세요.",
    );
  }
  return steps;
}

export function computeLeaveDays(
  leaveType: LeaveType,
  start: Date,
  end: Date,
): number {
  if (leaveType === "HALF") return 0.5;
  return calcLeaveDays(start, end);
}

/** 연차 신청 → LeaveRequest + 전자결재 기안 상신 */
export async function submitLeaveAsApproval(params: {
  userId: string;
  userName: string;
  phone?: string | null;
  leaveType: LeaveType;
  startDate: Date;
  endDate: Date;
  reason: string | null;
  emergencyContact: string | null;
  /** 사용자가 직접 지정한 결재선 (없으면 기본: 인사→이사) */
  customApprovers?: { id: string; title: string }[] | null;
  /** 기안문 HTML 직접 편집 시 */
  contentHtml?: string | null;
  titleOverride?: string | null;
}) {
  const days = computeLeaveDays(params.leaveType, params.startDate, params.endDate);
  if (days <= 0) throw new Error("기간을 확인하세요.");

  const year = currentLeaveYear(params.startDate);
  const balance = await syncLeaveUsedDaysFromApproved(params.userId, year);
  const remaining = remainingDays(balance.accruedDays, balance.usedDays);
  if (days > remaining) {
    throw new Error(`잔여 연차(${remaining}일)를 초과합니다.`);
  }

  const overlap = await prisma.leaveRequest.count({
    where: {
      userId: params.userId,
      status: { in: ["PENDING", "APPROVED"] },
      startDate: { lte: params.endDate },
      endDate: { gte: params.startDate },
    },
  });
  if (overlap > 0) throw new Error("같은 기간에 이미 신청·승인된 연차가 있습니다.");

  let approvers: { id: string; name: string; title: string }[];
  if (params.customApprovers && params.customApprovers.length > 0) {
    const ids = params.customApprovers.map((a) => a.id);
    const users = await prisma.user.findMany({
      where: { id: { in: ids }, isActive: true },
      select: { id: true, name: true },
    });
    const map = new Map(users.map((u) => [u.id, u]));
    approvers = params.customApprovers.map((a) => {
      const u = map.get(a.id);
      if (!u) throw new Error("결재자 지정이 올바르지 않습니다.");
      return { id: u.id, name: u.name, title: a.title || "결재" };
    });
  } else {
    approvers = await resolveLeaveApprovers(params.userId);
  }
  if (approvers.length === 0) {
    throw new Error("결재자를 지정할 수 없습니다. 업무(인사/이사) 배정을 확인하세요.");
  }

  const jobs = await prisma.userJob.findMany({
    where: { userId: params.userId },
    include: { jobCategory: { select: { name: true } } },
  });
  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { dealer: { select: { name: true } }, role: true },
  });

  const template = await prisma.approvalTemplate.findFirst({
    where: { key: "leave" },
    select: { id: true },
  });
  const documentCategoryId = await getDefaultApprovalDocumentCategoryId();

  const content =
    params.contentHtml?.trim()
      ? sanitizeRichText(params.contentHtml)
      : buildLeaveDraftHtml({
          affiliation:
            user?.dealer?.name ?? (user?.role === "ADMIN" ? "본사" : "본사"),
          name: params.userName,
          jobTitles: jobs.map((j) => j.jobCategory.name).join(", "),
          remainingDays: remaining,
          leaveType: params.leaveType,
          startDate: params.startDate,
          endDate: params.endDate,
          days,
          reason: params.reason ?? "",
          emergencyContact:
            params.emergencyContact ?? params.phone ?? "",
        });

  const title =
    params.titleOverride?.trim() ||
    `[연차] ${params.userName} · ${params.leaveType === "HALF" ? "반차" : "연차"} ${days}일 (${fmtDate(params.startDate)}~${fmtDate(params.endDate)})`;

  const doc = await prisma.approvalDocument.create({
    data: {
      title,
      content,
      templateId: template?.id ?? null,
      documentCategoryId,
      drafterId: params.userId,
      status: "IN_PROGRESS",
      currentOrder: 1,
      submittedAt: new Date(),
      steps: {
        create: approvers.map((a, i) => ({
          approverId: a.id,
          stepOrder: i + 1,
          title: a.title,
        })),
      },
    },
    select: { id: true },
  });

  const leave = await prisma.leaveRequest.create({
    data: {
      userId: params.userId,
      startDate: params.startDate,
      endDate: params.endDate,
      days,
      leaveType: params.leaveType,
      reason: params.reason ? sanitizePlainText(params.reason) : null,
      emergencyContact: params.emergencyContact
        ? sanitizePlainText(params.emergencyContact)
        : null,
      status: "PENDING",
      approvalDocumentId: doc.id,
    },
    select: { id: true },
  });

  await Promise.all(
    approvers.slice(0, 1).map((a) =>
      createNotification({
        userId: a.id,
        type: "LEAVE_REQUEST",
        title: "연차 결재 요청",
        body: title,
        link: `/approval/${doc.id}`,
      }),
    ),
  );

  return { leaveId: leave.id, approvalId: doc.id };
}

/** 결재 완료 시 연차 차감 (발생 연차 − 승인 사용일수) */
export async function settleLeaveOnApprovalComplete(documentId: string) {
  const leave = await prisma.leaveRequest.findFirst({
    where: { approvalDocumentId: documentId },
  });
  if (!leave || leave.status !== "PENDING") return;

  const year = currentLeaveYear(leave.startDate);
  const balance = await syncLeaveUsedDaysFromApproved(leave.userId, year);
  const remaining = remainingDays(balance.accruedDays, balance.usedDays);
  if (leave.days > remaining) {
    await prisma.leaveRequest.update({
      where: { id: leave.id },
      data: {
        status: "REJECTED",
        reviewedAt: new Date(),
        reviewNote: "잔여 연차 부족으로 자동 반려",
      },
    });
    return;
  }

  await prisma.$transaction([
    prisma.leaveRequest.update({
      where: { id: leave.id },
      data: { status: "APPROVED", reviewedAt: new Date() },
    }),
    prisma.leaveBalance.update({
      where: { id: balance.id },
      data: { usedDays: { increment: leave.days } },
    }),
  ]);

  // 승인 합계 기준으로 재동기화 (드리프트·중복 방지)
  await syncLeaveUsedDaysFromApproved(leave.userId, year);

  await createNotification({
    userId: leave.userId,
    type: "LEAVE_RESULT",
    title: "연차 승인",
    body: `${leave.days}일 연차 사용이 승인되어 잔여 연차에서 차감되었습니다.`,
    link: "/leave",
  });
}

/** 결재 반려 시 연차 신청 반려 */
export async function settleLeaveOnApprovalReject(documentId: string, note?: string) {
  const leave = await prisma.leaveRequest.findFirst({
    where: { approvalDocumentId: documentId },
  });
  if (!leave || leave.status !== "PENDING") return;
  await prisma.leaveRequest.update({
    where: { id: leave.id },
    data: {
      status: "REJECTED",
      reviewedAt: new Date(),
      reviewNote: note ?? null,
    },
  });
  await createNotification({
    userId: leave.userId,
    type: "LEAVE_RESULT",
    title: "연차 반려",
    body: `연차 신청이 반려되었습니다.${note ? ` (${note})` : ""}`,
    link: "/leave",
  });
}
