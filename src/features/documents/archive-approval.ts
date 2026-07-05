import "server-only";

import { prisma } from "@/lib/prisma";

/** 결재 완료 문서를 문서함에 보관 */
export async function archiveApprovalToDocuments(documentId: string) {
  const doc = await prisma.approvalDocument.findUnique({
    where: { id: documentId },
    include: {
      drafter: { select: { name: true, dealerId: true } },
      documentCategory: true,
      archivedDocument: { select: { id: true } },
    },
  });

  if (!doc || doc.status !== "COMPLETED") return;
  if (doc.archivedDocument) return;

  const plain = doc.content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const description = `${doc.drafter.name} 기안 · ${plain.slice(0, 120)}${plain.length > 120 ? "…" : ""}`;

  await prisma.sharedDocument.create({
    data: {
      title: doc.title,
      description,
      url: `/approval/${doc.id}`,
      documentCategoryId: doc.documentCategoryId,
      category: doc.documentCategory?.name ?? "전자결재",
      approvalDocumentId: doc.id,
      dealerId: doc.drafter.dealerId,
      tags: ["전자결재", "완료"],
    },
  });
}
