import "server-only";

import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

import { prisma } from "@/lib/prisma";
import { embedTexts } from "./embeddings";
import { deleteSource, upsertChunks } from "./vector-store";
import { CHUNK_SIZE, CHUNK_OVERLAP } from "./config";
import { resolveChunkDealerScope } from "./scope";

function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<\/(p|div|li|h[1-6]|br)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: CHUNK_SIZE,
  chunkOverlap: CHUNK_OVERLAP,
});

/** 단일 게시글을 인제스트(재색인)한다. */
export async function ingestPost(postId: string): Promise<void> {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: {
      id: true,
      title: true,
      content: true,
      board: { select: { key: true, name: true } },
    },
  });

  if (!post) {
    await deleteSource("post", postId);
    return;
  }

  const body = htmlToText(post.content);
  const text = `${post.title}\n\n${body}`.trim();
  const title = `[${post.board.name}] ${post.title}`;
  const url = `/boards/${post.board.key}/${post.id}`;

  await deleteSource("post", post.id);

  const chunks = await splitter.splitText(text);
  if (chunks.length === 0) return;

  const embeddings = await embedTexts(chunks);
  const scope = resolveChunkDealerScope(null);
  const items = chunks
    .map((content, idx) => {
      const embedding = embeddings[idx];
      if (!embedding) return null;
      return {
        sourceType: "post",
        sourceId: post.id,
        chunkIndex: idx,
        title,
        url,
        content,
        embedding,
        dealerId: scope.dealerId,
        minRole: scope.minRole,
      };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null);
  await upsertChunks(items);
}

/** 결재 완료 문서를 AI 지식베이스에 색인 */
export async function ingestApprovalDocument(documentId: string): Promise<void> {
  const doc = await prisma.approvalDocument.findUnique({
    where: { id: documentId },
    include: {
      drafter: { select: { dealerId: true } },
      documentCategory: { select: { name: true } },
    },
  });

  if (!doc || doc.status !== "COMPLETED") {
    await deleteSource("approval", documentId);
    return;
  }

  const body = htmlToText(doc.content);
  const cat = doc.documentCategory?.name ?? "전자결재";
  const amountLine = doc.amount ? `\n금액: ${doc.amount.toLocaleString("ko-KR")}원` : "";
  const text = `${doc.title}\n[${cat}]${amountLine}\n\n${body}`.trim();
  const title = `[결재완료·${cat}] ${doc.title}`;
  const url = `/approval/${doc.id}`;

  await deleteSource("approval", doc.id);

  const chunks = await splitter.splitText(text);
  if (chunks.length === 0) return;

  const embeddings = await embedTexts(chunks);
  const scope = resolveChunkDealerScope(doc.drafter.dealerId);
  const items = chunks
    .map((content, idx) => {
      const embedding = embeddings[idx];
      if (!embedding) return null;
      return {
        sourceType: "approval",
        sourceId: doc.id,
        chunkIndex: idx,
        title,
        url,
        content,
        embedding,
        dealerId: scope.dealerId,
        minRole: scope.minRole,
      };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null);
  await upsertChunks(items);
}

/** 문서함 SharedDocument 색인 */
export async function ingestSharedDocument(sharedId: string): Promise<void> {
  const doc = await prisma.sharedDocument.findUnique({
    where: { id: sharedId },
  });

  if (!doc) {
    await deleteSource("shared_doc", sharedId);
    return;
  }

  const text = `${doc.title}\n\n${doc.description ?? ""}`.trim();
  const title = `[문서함] ${doc.title}`;
  const url = doc.url ?? `/documents`;

  await deleteSource("shared_doc", doc.id);

  const chunks = await splitter.splitText(text);
  if (chunks.length === 0) return;

  const embeddings = await embedTexts(chunks);
  const scope = resolveChunkDealerScope(doc.dealerId);
  const items = chunks
    .map((content, idx) => {
      const embedding = embeddings[idx];
      if (!embedding) return null;
      return {
        sourceType: "shared_doc",
        sourceId: doc.id,
        chunkIndex: idx,
        title,
        url,
        content,
        embedding,
        dealerId: scope.dealerId,
        minRole: scope.minRole,
      };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null);
  await upsertChunks(items);
}

export async function removePost(postId: string): Promise<void> {
  await deleteSource("post", postId);
}

/** 전체 게시글을 일괄 인제스트한다(초기 색인 / 관리자 동기화용). */
export async function ingestAllPosts(): Promise<number> {
  const posts = await prisma.post.findMany({ select: { id: true } });
  let count = 0;
  for (const p of posts) {
    await ingestPost(p.id);
    count += 1;
  }
  return count;
}

/** 특정 게시판만 인제스트 */
export async function ingestBoardPosts(boardKeys: string[]): Promise<number> {
  if (boardKeys.length === 0) return 0;
  const boards = await prisma.board.findMany({
    where: { key: { in: boardKeys } },
    select: { id: true },
  });
  const posts = await prisma.post.findMany({
    where: { boardId: { in: boards.map((b) => b.id) } },
    select: { id: true },
  });
  for (const p of posts) {
    await ingestPost(p.id);
  }
  return posts.length;
}
