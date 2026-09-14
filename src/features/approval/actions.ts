"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { sanitizeRichText, sanitizePlainText } from "@/lib/sanitize";
import { archiveApprovalToDocuments } from "@/features/documents/archive-approval";
import { allocateIntakeDocumentNumber } from "@/features/documents/document-number";
import { createNotification } from "@/features/notifications/service";
import { writeAudit } from "@/lib/audit/service";
import {
  deleteStoredFile,
  savePngBuffer,
  saveUploadedFile,
} from "@/lib/uploads";
import {
  APPROVAL_MAX_FILES,
  APPROVAL_MAX_FILE_SIZE,
  APPROVAL_MAX_SEQUENTIAL_STEPS,
  isApprovalKind,
  isApprovalStepRole,
  type ApprovalKind,
  type ApprovalStepRole,
} from "./kinds";

export interface ActionState {
  error?: string | null;
  ok?: boolean;
}

interface RawStep {
  approverId: string;
  stepOrder: number;
  title?: string | null;
  role?: ApprovalStepRole;
}

/** 결재선 순서를 1..n 으로 연속화(같은 순서=병렬 유지) */
function normalizeSteps(raw: RawStep[]): RawStep[] {
  const valid = raw.filter((s) => s && typeof s.approverId === "string" && s.approverId);
  const orders = [...new Set(valid.map((s) => Number(s.stepOrder) || 1))].sort(
    (a, b) => a - b,
  );
  const remap = new Map(orders.map((o, i) => [o, i + 1]));
  return valid.map((s) => {
    const title =
      typeof s.title === "string" && s.title.trim() ? s.title.trim().slice(0, 40) : null;
    const role: ApprovalStepRole = isApprovalStepRole(String(s.role ?? ""))
      ? (s.role as ApprovalStepRole)
      : "APPROVER";
    return {
      approverId: s.approverId,
      stepOrder: remap.get(Number(s.stepOrder) || 1) ?? 1,
      title,
      role,
    };
  });
}

function plainLen(html: string) {
  return html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").trim().length;
}

function parseKind(raw: string): ApprovalKind {
  return isApprovalKind(raw) ? raw : "GENERAL";
}

async function collectUploadedFiles(formData: FormData) {
  const files = formData
    .getAll("files")
    .filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length > APPROVAL_MAX_FILES) {
    throw new Error(`첨부파일은 최대 ${APPROVAL_MAX_FILES}개까지 가능합니다.`);
  }
  for (const f of files) {
    if (f.size > APPROVAL_MAX_FILE_SIZE) {
      throw new Error(
        `"${f.name}" 파일이 ${APPROVAL_MAX_FILE_SIZE / 1024 / 1024}MB를 초과합니다.`,
      );
    }
  }
  return files;
}

async function persistAttachments(opts: {
  documentId: string;
  userId: string;
  files: File[];
  removeIds: string[];
}) {
  if (opts.removeIds.length) {
    const toDel = await prisma.approvalAttachment.findMany({
      where: { id: { in: opts.removeIds }, documentId: opts.documentId },
    });
    await prisma.approvalAttachment.deleteMany({
      where: { id: { in: toDel.map((t) => t.id) } },
    });
    await Promise.all(toDel.map((t) => deleteStoredFile(t.storageKey)));
  }

  const existing = await prisma.approvalAttachment.count({
    where: { documentId: opts.documentId },
  });
  if (existing + opts.files.length > APPROVAL_MAX_FILES) {
    throw new Error(`첨부파일은 최대 ${APPROVAL_MAX_FILES}개까지 가능합니다.`);
  }

  const saved: Awaited<ReturnType<typeof saveUploadedFile>>[] = [];
  try {
    for (const f of opts.files) {
      saved.push(await saveUploadedFile(f, { userId: opts.userId }));
    }
    if (saved.length) {
      await prisma.approvalAttachment.createMany({
        data: saved.map((s) => ({
          documentId: opts.documentId,
          filename: s.filename,
          storageKey: s.storageKey,
          mimeType: s.mimeType,
          size: s.size,
        })),
      });
    }
  } catch (e) {
    await Promise.all(saved.map((s) => deleteStoredFile(s.storageKey)));
    throw e;
  }
}

function parseDataUrlPng(raw: string): Buffer | null {
  const m = raw.trim().match(/^data:image\/png;base64,([A-Za-z0-9+/=]+)$/);
  if (!m?.[1]) return null;
  return Buffer.from(m[1], "base64");
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

  const kind = parseKind(String(formData.get("kind") ?? "GENERAL"));
  const templateId = String(formData.get("templateId") ?? "").trim() || null;
  const documentCategoryId =
    String(formData.get("documentCategoryId") ?? "").trim() || null;

  if (!documentCategoryId) {
    return { error: "문서함을 반드시 선택하세요." };
  }
  const catOk = await prisma.documentCategory.findFirst({
    where: {
      id: documentCategoryId,
      OR: [{ ownerId: null }, { ownerId: userId }],
    },
    select: { id: true },
  });
  if (!catOk) return { error: "선택한 문서함을 사용할 수 없습니다." };

  const content = sanitizeRichText(String(formData.get("content") ?? ""));

  let parsed: RawStep[] = [];
  try {
    parsed = JSON.parse(String(formData.get("steps") ?? "[]"));
  } catch {
    parsed = [];
  }
  const steps = normalizeSteps(parsed);

  let files: File[] = [];
  try {
    files = await collectUploadedFiles(formData);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "첨부파일 오류" };
  }
  const removeIds = String(formData.get("removeAttachmentIds") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (submit) {
    if (kind !== "INTAKE" && plainLen(content) === 0) {
      return { error: "본문 내용을 입력하세요." };
    }
    if (steps.length === 0) return { error: "결재선을 1명 이상 지정하세요." };
    const sequentialOrders = [
      ...new Set(
        steps.filter((s) => s.role !== "COOPERATE").map((s) => s.stepOrder),
      ),
    ];
    if (sequentialOrders.length > APPROVAL_MAX_SEQUENTIAL_STEPS) {
      return {
        error: `결재는 담당·검토·승인 순으로 최대 ${APPROVAL_MAX_SEQUENTIAL_STEPS}단계까지입니다. 협조자는 최종 결재 직전에 추가하세요.`,
      };
    }
    const ids = [...new Set(steps.map((s) => s.approverId))];
    const found = await prisma.user.count({ where: { id: { in: ids } } });
    if (found !== ids.length) {
      return { error: "유효하지 않은 결재자가 포함되어 있습니다." };
    }
  }

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

  if (submit && kind === "INTAKE") {
    const existingCount = id
      ? await prisma.approvalAttachment.count({
          where: {
            documentId: id,
            ...(removeIds.length ? { id: { notIn: removeIds } } : {}),
          },
        })
      : 0;
    if (existingCount + files.length === 0) {
      return { error: "문서접수에는 스캔 파일 등 첨부가 1개 이상 필요합니다." };
    }
  }

  const status = submit ? "IN_PROGRESS" : "DRAFT";
  let docId = id;
  let intakeNumber: string | null = null;
  if (submit && kind === "INTAKE") {
    intakeNumber = await allocateIntakeDocumentNumber();
  }

  try {
    const stepCreate = {
      create: steps.map((s) => ({
        approverId: s.approverId,
        stepOrder: s.stepOrder,
        title: s.title ?? null,
        role: s.role ?? "APPROVER",
      })),
    };

    if (id) {
      await prisma.$transaction([
        prisma.approvalStep.deleteMany({ where: { documentId: id } }),
        prisma.approvalDocument.update({
          where: { id },
          data: {
            title,
            content,
            kind,
            templateId,
            documentCategoryId,
            status,
            currentOrder: 1,
            submittedAt: submit ? new Date() : null,
            ...(intakeNumber ? { documentNumber: intakeNumber } : {}),
            steps: stepCreate,
          },
        }),
      ]);
    } else {
      const created = await prisma.approvalDocument.create({
        data: {
          title,
          content,
          kind,
          templateId,
          documentCategoryId,
          drafterId: userId,
          status,
          currentOrder: 1,
          submittedAt: submit ? new Date() : null,
          ...(intakeNumber ? { documentNumber: intakeNumber } : {}),
          steps: stepCreate,
        },
        select: { id: true },
      });
      docId = created.id;
    }

    await persistAttachments({
      documentId: docId!,
      userId,
      files,
      removeIds: id ? removeIds : [],
    });
  } catch (e) {
    console.error("[approval] 저장 실패:", e);
    return {
      error: e instanceof Error ? e.message : "문서 저장에 실패했습니다.",
    };
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
    const { ingestApproval } = await import("@/lib/ai/ingest");
    void ingestApproval(docId).catch((e) =>
      console.error("[approval] ingest:", e),
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
      const { settleLeaveOnApprovalComplete } = await import(
        "@/features/leave/approval-bridge"
      );
      await settleLeaveOnApprovalComplete(docId);
      await createNotification({
        userId: doc.drafterId,
        type: "APPROVAL_RESULT",
        title: "결재가 완료되었습니다. 시행을 진행해 주세요.",
        body: doc.title,
        link: `/approval/${docId}`,
      });
      revalidatePath("/documents");
      revalidatePath("/leave");
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

  const { settleLeaveOnApprovalReject } = await import(
    "@/features/leave/approval-bridge"
  );
  await settleLeaveOnApprovalReject(docId, comment);

  await createNotification({
    userId: doc.drafterId,
    type: "APPROVAL_RESULT",
    title: "결재가 반려되었습니다",
    body: doc.title,
    link: `/approval/${docId}`,
  });

  revalidatePath(`/approval/${docId}`);
  revalidatePath("/approval");
  revalidatePath("/leave");
  return { ok: true, error: null };
}

// ──────────────────────────────────────────────
// 시행 (최종 결재 후 기안자 · 디지털 인감/서명)
// ──────────────────────────────────────────────
export async function executeDocumentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (!session?.user) return { error: "로그인이 필요합니다." };
  const userId = session.user.id;

  const docId = String(formData.get("documentId") ?? "");
  const doc = await prisma.approvalDocument.findUnique({
    where: { id: docId },
    select: {
      id: true,
      drafterId: true,
      status: true,
      executedAt: true,
      kind: true,
      title: true,
    },
  });
  if (!doc) return { error: "존재하지 않는 문서입니다." };
  if (doc.drafterId !== userId) return { error: "기안자만 시행할 수 있습니다." };
  if (doc.status !== "COMPLETED") return { error: "최종 결재 후에만 시행할 수 있습니다." };
  if (doc.executedAt) return { error: "이미 시행된 문서입니다." };

  const sealData = parseDataUrlPng(String(formData.get("sealDataUrl") ?? ""));
  const signData = parseDataUrlPng(String(formData.get("signatureDataUrl") ?? ""));
  const sealFile = formData.get("sealFile");
  const signFile = formData.get("signatureFile");

  let sealStorageKey: string | null = null;
  let signatureStorageKey: string | null = null;

  try {
    if (sealData) {
      const saved = await savePngBuffer(sealData, "사용인감.png", { userId });
      sealStorageKey = saved.storageKey;
    } else if (sealFile instanceof File && sealFile.size > 0) {
      const saved = await saveUploadedFile(sealFile, { userId });
      sealStorageKey = saved.storageKey;
    }
    if (signData) {
      const saved = await savePngBuffer(signData, "발송자서명.png", { userId });
      signatureStorageKey = saved.storageKey;
    } else if (signFile instanceof File && signFile.size > 0) {
      const saved = await saveUploadedFile(signFile, { userId });
      signatureStorageKey = saved.storageKey;
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "인감/서명 저장 실패" };
  }

  if (doc.kind === "EXTERNAL_OFFICIAL" && !sealStorageKey) {
    return { error: "외부공문은 디지털 사용인감이 필요합니다." };
  }
  if (doc.kind === "INTERNAL_OFFICIAL" && !signatureStorageKey) {
    return { error: "내부공문은 발송자(책임자) 서명이 필요합니다." };
  }
  if (!sealStorageKey && !signatureStorageKey) {
    return { error: "디지털 인감 또는 서명을 입력하세요." };
  }

  await prisma.approvalDocument.update({
    where: { id: docId },
    data: {
      executedAt: new Date(),
      executedById: userId,
      sealStorageKey,
      signatureStorageKey,
    },
  });

  void writeAudit({
    action: "APPROVAL_EXECUTE",
    userId,
    resource: docId,
    detail: doc.title,
  });

  revalidatePath(`/approval/${docId}`);
  revalidatePath("/approval");
  revalidatePath("/documents");
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
    select: {
      drafterId: true,
      status: true,
      attachments: { select: { storageKey: true } },
      sealStorageKey: true,
      signatureStorageKey: true,
    },
  });
  if (!doc) redirect("/approval");

  const deletable =
    doc.drafterId === session.user.id &&
    (doc.status === "DRAFT" || doc.status === "REJECTED");
  if (!deletable) redirect(`/approval/${docId}`);

  await Promise.all([
    ...doc.attachments.map((a) => deleteStoredFile(a.storageKey)),
    doc.sealStorageKey ? deleteStoredFile(doc.sealStorageKey) : Promise.resolve(),
    doc.signatureStorageKey
      ? deleteStoredFile(doc.signatureStorageKey)
      : Promise.resolve(),
  ]);

  await prisma.approvalDocument.delete({ where: { id: docId } });
  revalidatePath("/approval");
  redirect("/approval");
}
