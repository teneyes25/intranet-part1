import "server-only";

import { prisma } from "@/lib/prisma";

export async function getTemplates() {
  return prisma.approvalTemplate.findMany({ orderBy: { createdAt: "asc" } });
}

/** 결재자로 지정 가능한 사용자 목록(본인 제외) */
export async function getApproverCandidates(excludeUserId: string) {
  return prisma.user.findMany({
    where: { isActive: true, id: { not: excludeUserId } },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      dealer: { select: { name: true } },
    },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });
}

const documentInclude = {
  drafter: { select: { id: true, name: true, email: true, role: true } },
  template: { select: { name: true } },
  steps: {
    include: {
      approver: { select: { id: true, name: true, role: true } },
    },
    orderBy: [{ stepOrder: "asc" as const }, { createdAt: "asc" as const }],
  },
};

export async function getDocument(id: string) {
  return prisma.approvalDocument.findUnique({
    where: { id },
    include: documentInclude,
  });
}

export type ApprovalDocumentDetail = NonNullable<
  Awaited<ReturnType<typeof getDocument>>
>;

/** 기안함: 내가 기안한 모든 문서 */
export async function listMyDrafts(userId: string) {
  return prisma.approvalDocument.findMany({
    where: { drafterId: userId },
    include: documentInclude,
    orderBy: { updatedAt: "desc" },
  });
}

/** 수신함: 내가 결재자로 포함된 진행중 문서 */
export async function listInbox(userId: string) {
  const docs = await prisma.approvalDocument.findMany({
    where: {
      status: "IN_PROGRESS",
      steps: { some: { approverId: userId } },
    },
    include: documentInclude,
    orderBy: { submittedAt: "desc" },
  });

  return docs.map((doc) => ({
    ...doc,
    isMyTurn: doc.steps.some(
      (s) =>
        s.approverId === userId &&
        s.status === "PENDING" &&
        s.stepOrder === doc.currentOrder,
    ),
  }));
}

/** 완료함: 내가 관여한 완료/반려 문서 */
export async function listCompleted(userId: string) {
  return prisma.approvalDocument.findMany({
    where: {
      status: { in: ["COMPLETED", "REJECTED"] },
      OR: [{ drafterId: userId }, { steps: { some: { approverId: userId } } }],
    },
    include: documentInclude,
    orderBy: { completedAt: "desc" },
  });
}

/** 각 문서함 카운트 */
export async function getBoxCounts(userId: string) {
  const inbox = await listInbox(userId);
  const [draftsInProgress, completed] = await Promise.all([
    prisma.approvalDocument.count({
      where: { drafterId: userId, status: "IN_PROGRESS" },
    }),
    prisma.approvalDocument.count({
      where: {
        status: { in: ["COMPLETED", "REJECTED"] },
        OR: [{ drafterId: userId }, { steps: { some: { approverId: userId } } }],
      },
    }),
  ]);

  return {
    myTurn: inbox.filter((d) => d.isMyTurn).length,
    inbox: inbox.length,
    draftsInProgress,
    completed,
  };
}
