import "server-only";

import { prisma } from "@/lib/prisma";
import { DOCUMENT_POST_CATEGORY_DRAFT } from "@/features/documents/constants";

/**
 * 결재 완료 문서를 지정된 문서함 하위 게시판(기안문)으로 이동·보관한다.
 * 문서함이 지정되지 않았거나 하위 게시판이 없으면 보관하지 않는다.
 */
export async function archiveApprovalToDocuments(documentId: string) {
  const doc = await prisma.approvalDocument.findUnique({
    where: { id: documentId },
    include: {
      drafter: { select: { id: true, name: true } },
      documentBox: {
        include: { board: { select: { id: true, key: true, name: true } } },
      },
      archivedDocument: { select: { id: true } },
    },
  });

  if (!doc || doc.status !== "COMPLETED") return;
  if (doc.archivedDocument) return;

  const box = doc.documentBox;
  if (!box?.boardId || !box.board) {
    console.warn(
      "[documents] 결재 완료 문서에 문서함/하위 게시판이 없어 보관 생략:",
      documentId,
    );
    return;
  }

  const plain = doc.content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const description = `${doc.drafter.name} 기안 · ${plain.slice(0, 120)}${plain.length > 120 ? "…" : ""}`;

  // 하위 게시판에 기안문으로 게시
  const post = await prisma.post.create({
    data: {
      boardId: box.boardId,
      authorId: doc.drafterId,
      title: doc.title,
      content: doc.content,
      category: DOCUMENT_POST_CATEGORY_DRAFT,
    },
  });

  await prisma.sharedDocument.create({
    data: {
      title: doc.title,
      description,
      url: `/boards/${box.board.key}/${post.id}`,
      documentCategoryId: box.id,
      category: box.name,
      boardKey: box.board.key,
      postId: post.id,
      approvalDocumentId: doc.id,
      docType: DOCUMENT_POST_CATEGORY_DRAFT,
      tags: ["전자결재", "완료", DOCUMENT_POST_CATEGORY_DRAFT],
    },
  });
}
