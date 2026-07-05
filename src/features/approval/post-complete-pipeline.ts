import "server-only";

import { archiveApprovalToDocuments } from "@/features/documents/archive-approval";
import { ingestApprovalDocument, ingestSharedDocument } from "@/lib/ai/ingest";
import { writeAudit } from "@/lib/audit/service";
import { prisma } from "@/lib/prisma";

/** 결재 완료 후 문서함 보관 + AI ingest + 감사 로그 */
export async function triggerPostApprovalPipeline(
  documentId: string,
  actorUserId?: string,
): Promise<void> {
  await archiveApprovalToDocuments(documentId);
  await ingestApprovalDocument(documentId).catch((e) =>
    console.error("[pipeline] approval ingest failed:", documentId, e),
  );

  const shared = await prisma.sharedDocument.findFirst({
    where: { approvalDocumentId: documentId },
    select: { id: true },
  });
  if (shared) {
    await ingestSharedDocument(shared.id).catch((e) =>
      console.error("[pipeline] shared doc ingest failed:", shared.id, e),
    );
  }

  void writeAudit({
    action: "APPROVAL_APPROVE",
    userId: actorUserId,
    resource: documentId,
    detail: "archived+ingested",
  });
}
