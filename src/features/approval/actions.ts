"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { sanitizeRichText, sanitizePlainText } from "@/lib/sanitize";
import { archiveApprovalToDocuments } from "@/features/documents/archive-approval";
import { createNotification } from "@/features/notifications/service";
import { writeAudit } from "@/lib/audit/service";

export interface ActionState {
  error?: string | null;
  ok?: boolean;
}

interface RawStep {
  approverId: string;
  stepOrder: number;
}

/** 결재선 순서를 1..n 으로 연속화(같은 순서=병렬 유지) */
function normalizeSteps(raw: RawStep[]): RawStep[] {
  const valid = raw.filter((s) => s && typeof s.approverId === "string" && s.approverId);
  const orders = [...new Set(valid.map((s) => Number(s.stepOrder) || 1))].sort(
    (a, b) => a - b,
  );
  const remap = new Map(orders.map((o, i) => [o, i + 1]));
  return valid.map((s) => ({
    approverId: s.approverId,
    stepOrder: remap.get(Number(s.stepOrder) || 1) ?? 1,
  }));
}

function plainLen(html: string) {
  return html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").trim().length;
}

// ──────────────────────────────────────────────
// 기안서 저장(임시저장) / 상신(제출)
// ──────────────────────────────────────────────
export async function saveDocumentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (!session?.user) return { error: "로그인이 필요합니다." };
  const userId = session.user.id;

  const id = String(formData.get("id") ?? "").trim() || null;
  const intent = String(formData.get("intent") ?? "draft");
  const submit = intent === "submit";

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "제목을 입력하세요." };

  const templateId = String(formData.get("templateId") ?? "").trim() || null;
  const documentCategoryId =
    String(formData.get("documentCategoryId") ?? "").trim() || null;
  const content = sanitizeRichText(String(formData.get("content") ?? ""));

  let parsed: RawStep[] = [];
  try {
    parsed = JSON.parse(String(formData.get("steps") ?? "[]"));
  } catch {
    parsed = [];
  }
  const steps = normalizeSteps(parsed);

  if (submit) {
    if (plainLen(content) === 0) return { error: "본문 내용을 입력하세요." };
    if (steps.length === 0) return { error: "결재선을 1명 이상 지정하세요." };
    const ids = [...new Set(steps.map((s) => s.approverId))];
    const found = await prisma.user.count({ where: { id: { in: ids } } });
    if (found !== ids.length) {
      return { error: "유효하지 않은 결재자가 포함되어 있습니다." };
    }
  }

  // 기존 문서 수정 권한 체크
  if (id) {
    const existing = await prisma.approvalDocument.findUnique({
      where: { id },
      select: { drafterId: true, status: true },
    });
    if (!existing) return { error: "존재하지 않는 문서입니다." };
    if (existing.drafterId !== userId || existing.status !== "DRAFT") {
      return { error: "수정할 수 없는 문서입니다." };
    }
  }

  const status = submit ? "IN_PROGRESS" : "DRAFT";
  let docId = id;

  try {
    if (id) {
      await prisma.$transaction([
        prisma.approvalStep.deleteMany({ where: { documentId: id } }),
        prisma.approvalDocument.update({
          where: { id },
          data: {
            title,
            content,
            templateId,
            documentCategoryId,
            status,
            currentOrder: 1,
            submittedAt: submit ? new Date() : null,
            steps: {
              create: steps.map((s) => ({
                approverId: s.approverId,
                stepOrder: s.stepOrder,
              })),
            },
          },
        }),
      ]);
    } else {
      const created = await prisma.approvalDocument.create({
        data: {
          title,
          content,
          templateId,
          documentCategoryId,
          drafterId: userId,
          status,
          currentOrder: 1,
          submittedAt: submit ? new Date() : null,
          steps: {
            create: steps.map((s) => ({
              approverId: s.approverId,
              stepOrder: s.stepOrder,
            })),
          },
        },
        select: { id: true },
      });
      docId = created.id;
    }
  } catch (e) {
    console.error("[approval] 저장 실패:", e);
    return { error: "문서 저장에 실패했습니다." };
  }

  if (submit && docId) {
    const approverIds = [...new Set(steps.map((s) => s.approverId))];
    await Promise.all(
      approverIds.map((uid) =>
        createNotification({
          userId: uid,
          type: "APPROVAL_REQUEST",
          title: "전자결재 승인 요청",
          body: title,
          link: `/approval/${docId}`,
        }),
      ),
    );
  }

  revalidatePath("/approval");
  redirect(`/approval/${docId}`);
}

// ──────────────────────────────────────────────
// 승인
// ──────────────────────────────────────────────
export async function approveAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (!session?.user) return { error: "로그인이 필요합니다." };
  const userId = session.user.id;

  const docId = String(formData.get("documentId") ?? "");
  const comment = sanitizePlainText(String(formData.get("comment") ?? "")).trim();

  const doc = await prisma.approvalDocument.findUnique({
    where: { id: docId },
    include: { steps: true },
  });
  if (!doc || doc.status !== "IN_PROGRESS") {
    return { error: "결재할 수 없는 문서입니다." };
  }

  const myStep = doc.steps.find(
    (s) =>
      s.approverId === userId &&
      s.status === "PENDING" &&
      s.stepOrder === doc.currentOrder,
  );
  if (!myStep) return { error: "현재 결재할 차례가 아닙니다." };

  await prisma.approvalStep.update({
    where: { id: myStep.id },
    data: { status: "APPROVED", comment: comment || null, actedAt: new Date() },
  });

  // 현재 순서의 남은 대기 단계 확인 → 다음 순서 또는 완료
  const updatedSteps = doc.steps.map((s) =>
    s.id === myStep.id ? { ...s, status: "APPROVED" as const } : s,
  );
  const pendingAtCurrent = updatedSteps.filter(
    (s) => s.stepOrder === doc.currentOrder && s.status === "PENDING",
  );

  if (pendingAtCurrent.length === 0) {
    const nextOrders = updatedSteps
      .filter((s) => s.stepOrder > doc.currentOrder)
      .map((s) => s.stepOrder);
    if (nextOrders.length > 0) {
      const nextOrder = Math.min(...nextOrders);
      await prisma.approvalDocument.update({
        where: { id: docId },
        data: { currentOrder: nextOrder },
      });
      const nextApprovers = updatedSteps
        .filter((s) => s.stepOrder === nextOrder && s.status === "PENDING")
        .map((s) => s.approverId);
      await Promise.all(
        nextApprovers.map((uid) =>
          createNotification({
            userId: uid,
            type: "APPROVAL_REQUEST",
            title: "전자결재 승인 요청",
            body: doc.title,
            link: `/approval/${docId}`,
          }),
        ),
      );
    } else {
      await prisma.approvalDocument.update({
        where: { id: docId },
        data: { status: "COMPLETED", completedAt: new Date() },
      });
      await archiveApprovalToDocuments(docId);
      void import("@/lib/knowledge/intranet-bridge").then(({ maybeRecordKnowledgeApproval }) =>
        maybeRecordKnowledgeApproval({
          sourceId: docId,
          title: doc.title,
        }),
      );
      await createNotification({
        userId: doc.drafterId,
        type: "APPROVAL_RESULT",
        title: "결재가 완료되었습니다",
        body: doc.title,
        link: `/approval/${docId}`,
      });
      revalidatePath("/documents");
      void writeAudit({
        action: "APPROVAL_APPROVE",
        userId,
        resource: docId,
        detail: "completed",
      });
    }
  }

  revalidatePath(`/approval/${docId}`);
  revalidatePath("/approval");
  return { ok: true, error: null };
}

// ──────────────────────────────────────────────
// 반려
// ──────────────────────────────────────────────
export async function rejectAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (!session?.user) return { error: "로그인이 필요합니다." };
  const userId = session.user.id;

  const docId = String(formData.get("documentId") ?? "");
  const comment = sanitizePlainText(String(formData.get("comment") ?? "")).trim();
  if (!comment) return { error: "반려 사유를 입력하세요." };

  const doc = await prisma.approvalDocument.findUnique({
    where: { id: docId },
    include: { steps: true },
  });
  if (!doc || doc.status !== "IN_PROGRESS") {
    return { error: "결재할 수 없는 문서입니다." };
  }

  const myStep = doc.steps.find(
    (s) =>
      s.approverId === userId &&
      s.status === "PENDING" &&
      s.stepOrder === doc.currentOrder,
  );
  if (!myStep) return { error: "현재 결재할 차례가 아닙니다." };

  await prisma.$transaction([
    prisma.approvalStep.update({
      where: { id: myStep.id },
      data: { status: "REJECTED", comment, actedAt: new Date() },
    }),
    prisma.approvalDocument.update({
      where: { id: docId },
      data: { status: "REJECTED", completedAt: new Date() },
    }),
  ]);

  await createNotification({
    userId: doc.drafterId,
    type: "APPROVAL_RESULT",
    title: "결재가 반려되었습니다",
    body: doc.title,
    link: `/approval/${docId}`,
  });

  revalidatePath(`/approval/${docId}`);
  revalidatePath("/approval");
  return { ok: true, error: null };
}

// ──────────────────────────────────────────────
// 삭제 (임시저장/반려 문서, 기안자만)
// ──────────────────────────────────────────────
export async function deleteDocumentAction(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const docId = String(formData.get("documentId") ?? "");
  const doc = await prisma.approvalDocument.findUnique({
    where: { id: docId },
    select: { drafterId: true, status: true },
  });
  if (!doc) redirect("/approval");

  const deletable =
    doc.drafterId === session.user.id &&
    (doc.status === "DRAFT" || doc.status === "REJECTED");
  if (!deletable) redirect(`/approval/${docId}`);

  await prisma.approvalDocument.delete({ where: { id: docId } });
  revalidatePath("/approval");
  redirect("/approval");
}
