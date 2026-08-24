import "server-only";

import { prisma } from "@/lib/prisma";
import { getDefaultApprovalDocumentCategoryId } from "@/features/documents/category-service";

/** 결재 완료 문서를 문서함에 보관 (카테고리 필수 연동) */
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

  if (!categoryId) {
    categoryId = await getDefaultApprovalDocumentCategoryId();
    if (categoryId) {
      const cat = await prisma.documentCategory.findUnique({
        where: { id: categoryId },
      });
      categoryName = cat?.name ?? "전자결재";
      await prisma.approvalDocument.update({
        where: { id: doc.id },
        data: { documentCategoryId: categoryId },
      });
    }
  }

  const plain = doc.content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const description = `${doc.drafter.name} 기안 · ${plain.slice(0, 120)}${plain.length > 120 ? "…" : ""}`;

  await prisma.sharedDocument.create({
    data: {
      title: doc.title,
      description,
      url: `/approval/${doc.id}`,
      documentCategoryId: categoryId,
      category: categoryName ?? "전자결재",
      approvalDocumentId: doc.id,
      tags: ["전자결재", "완료"],
    },
  });
}
