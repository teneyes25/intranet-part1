import "server-only";

import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

import { prisma } from "@/lib/prisma";
import { embedTexts } from "./embeddings";
import { deleteSource, upsertChunks } from "./vector-store";
import { CHUNK_SIZE, CHUNK_OVERLAP } from "./config";

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

async function chunkAndUpsert(params: {
  sourceType: string;
  sourceId: string;
  title: string;
  url: string;
  text: string;
}) {
  await deleteSource(params.sourceType, params.sourceId);
  const chunks = await splitter.splitText(params.text.trim());
  if (chunks.length === 0) return 0;

  const embeddings = await embedTexts(chunks);
  const items = chunks
    .map((content, idx) => {
      const embedding = embeddings[idx];
      if (!embedding) return null;
      return {
        sourceType: params.sourceType,
        sourceId: params.sourceId,
        chunkIndex: idx,
        title: params.title,
        url: params.url,
        content,
        embedding,
      };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null);
  await upsertChunks(items);
  return items.length;
}

/** 단일 게시글(+댓글)을 인제스트(재색인)한다. */
export async function ingestPost(postId: string): Promise<void> {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: {
      id: true,
      title: true,
      content: true,
      category: true,
      board: { select: { key: true, name: true } },
      comments: {
        orderBy: { createdAt: "asc" },
        take: 50,
        select: {
          content: true,
          author: { select: { name: true } },
        },
      },
    },
  });

  if (!post) {
    await deleteSource("post", postId);
    return;
  }

  const body = htmlToText(post.content);
  const commentBlock =
    post.comments.length > 0
      ? `\n\n[댓글]\n${post.comments
          .map((c) => `- ${c.author.name}: ${c.content}`)
          .join("\n")}`
      : "";
  const categoryLine = post.category ? `카테고리: ${post.category}\n` : "";
  const text = `${categoryLine}${post.title}\n\n${body}${commentBlock}`.trim();
  const title = `[${post.board.name}] ${post.title}`;
  const url = `/boards/${post.board.key}/${post.id}`;

  await chunkAndUpsert({
    sourceType: "post",
    sourceId: post.id,
    title,
    url,
    text,
  });
}

export async function removePost(postId: string): Promise<void> {
  await deleteSource("post", postId);
}

/** 문서함 SharedDocument 인제스트 */
export async function ingestSharedDocument(docId: string): Promise<void> {
  const doc = await prisma.sharedDocument.findUnique({
    where: { id: docId },
    select: {
      id: true,
      title: true,
      description: true,
      category: true,
      url: true,
      tags: true,
      boardKey: true,
      postId: true,
      approvalDocumentId: true,
      documentCategory: { select: { name: true } },
    },
  });

  if (!doc) {
    await deleteSource("document", docId);
    return;
  }

  const cat = doc.documentCategory?.name ?? doc.category ?? "문서함";
  const parts = [
    `문서함 · ${cat}`,
    doc.title,
    doc.description ?? "",
    doc.tags.length ? `태그: ${doc.tags.join(", ")}` : "",
  ];
  const url =
    doc.url ||
    (doc.postId && doc.boardKey
      ? `/boards/${doc.boardKey}/${doc.postId}`
      : doc.approvalDocumentId
        ? `/approval/${doc.approvalDocumentId}`
        : `/documents`);

  await chunkAndUpsert({
    sourceType: "document",
    sourceId: doc.id,
    title: `[문서함·${cat}] ${doc.title}`,
    url,
    text: parts.filter(Boolean).join("\n"),
  });
}

export async function removeSharedDocument(docId: string): Promise<void> {
  await deleteSource("document", docId);
}

/** 전자결재 문서 인제스트 (임시저장 제외·본문 포함) */
export async function ingestApproval(docId: string): Promise<void> {
  const doc = await prisma.approvalDocument.findUnique({
    where: { id: docId },
    select: {
      id: true,
      title: true,
      content: true,
      status: true,
      drafter: { select: { name: true } },
      documentCategory: { select: { name: true } },
    },
  });

  if (!doc || doc.status === "DRAFT") {
    await deleteSource("approval", docId);
    return;
  }

  const body = htmlToText(doc.content);
  const text = [
    `전자결재 · ${doc.status}`,
    `기안자: ${doc.drafter.name}`,
    doc.documentCategory?.name
      ? `카테고리: ${doc.documentCategory.name}`
      : "",
    doc.title,
    body,
  ]
    .filter(Boolean)
    .join("\n");

  await chunkAndUpsert({
    sourceType: "approval",
    sourceId: doc.id,
    title: `[전자결재] ${doc.title}`,
    url: `/approval/${doc.id}`,
    text,
  });
}

export async function removeApproval(docId: string): Promise<void> {
  await deleteSource("approval", docId);
}

/** 전체 게시글 일괄 인제스트 */
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

export async function ingestAllSharedDocuments(): Promise<number> {
  const docs = await prisma.sharedDocument.findMany({ select: { id: true } });
  for (const d of docs) {
    await ingestSharedDocument(d.id);
  }
  return docs.length;
}

export async function ingestAllApprovals(): Promise<number> {
  const docs = await prisma.approvalDocument.findMany({
    where: { status: { not: "DRAFT" } },
    select: { id: true },
  });
  for (const d of docs) {
    await ingestApproval(d.id);
  }
  return docs.length;
}

/** 인트라넷 전체 지식(게시글·문서함·전자결재) 재학습 */
export async function ingestAllIntranetKnowledge(): Promise<{
  posts: number;
  documents: number;
  approvals: number;
  total: number;
}> {
  const posts = await ingestAllPosts();
  const documents = await ingestAllSharedDocuments();
  const approvals = await ingestAllApprovals();
  return {
    posts,
    documents,
    approvals,
    total: posts + documents + approvals,
  };
}
