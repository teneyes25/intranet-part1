import "server-only";

import { prisma } from "@/lib/prisma";
import { getDefaultApprovalDocumentCategoryId } from "@/features/documents/category-service";
import { allocateDocumentNumber } from "@/features/documents/document-number";
import { ingestApproval, ingestSharedDocument } from "@/lib/ai/ingest";

/** 결재 완료 문서를 문서함에 보관 + 문서번호·일자 부여 */
export async function archiveApprovalToDocuments(documentId: string) {
  const doc = await prisma.approvalDocument.findUnique({
    where: { id: documentId },
    include: {
      drafter: { select: { name: true } },
      documentCategory: true,
      archivedDocument: { select: { id: true } },
    },
  });

  if (!doc || doc.status !== "COMPLETED") return;
  if (doc.archivedDocument) return;

  let categoryId = doc.documentCategoryId;
  let categoryName = doc.documentCategory?.name ?? null;
  let workType =
    doc.documentCategory?.workTypeCode ||
    doc.documentCategory?.name ||
    "전자결재";

  if (!categoryId) {
    categoryId = await getDefaultApprovalDocumentCategoryId();
    if (categoryId) {
      const cat = await prisma.documentCategory.findUnique({
        where: { id: categoryId },
      });
      categoryName = cat?.name ?? "전자결재";
      workType = cat?.workTypeCode || cat?.name || "전자결재";
      await prisma.approvalDocument.update({
        where: { id: doc.id },
        data: { documentCategoryId: categoryId },
      });
    }
  }

  const now = new Date();
  const documentNumber =
    doc.documentNumber || (await allocateDocumentNumber(workType, now));
  const draftedAt = doc.submittedAt ?? doc.createdAt;
  const approvedAt = doc.completedAt ?? now;
  const registeredAt = now;

  await prisma.approvalDocument.update({
    where: { id: doc.id },
    data: {
      documentNumber,
      registeredAt,
      documentCategoryId: categoryId,
    },
  });

  const plain = doc.content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const description = `${doc.drafter.name} 기안 · ${plain.slice(0, 120)}${plain.length > 120 ? "…" : ""}`;

  const archived = await prisma.sharedDocument.create({
    data: {
      title: doc.title,
      description,
      url: `/approval/${doc.id}`,
      documentCategoryId: categoryId,
      category: categoryName ?? "전자결재",
      approvalDocumentId: doc.id,
      documentNumber,
      draftedAt,
      approvedAt,
      registeredAt,
      tags: ["전자결재", "완료"],
    },
    select: { id: true },
  });

  void ingestApproval(doc.id).catch((e) =>
    console.error("[archive-approval] ingest approval:", e),
  );
  void ingestSharedDocument(archived.id).catch((e) =>
    console.error("[archive-approval] ingest document:", e),
  );
}
