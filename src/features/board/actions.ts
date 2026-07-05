"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { sanitizeRichText, sanitizePlainText } from "@/lib/sanitize";
import {
  saveUploadedFile,
  deleteStoredFile,
  MAX_FILES,
  type SavedFile,
} from "@/lib/uploads";
import { canWriteBoard, canManagePost } from "@/features/board/permissions";
import { ingestPost, removePost } from "@/lib/ai/ingest";

/** 인제스트는 게시 흐름을 막지 않도록 백그라운드로 실행한다. */
function reindexPost(postId: string) {
  void ingestPost(postId).catch((e) =>
    console.error("[ai/ingest] 게시글 색인 실패:", postId, e),
  );
}

export interface ActionState {
  error?: string | null;
  ok?: boolean;
}

function plainTextLength(html: string) {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .trim().length;
}

function pickFiles(formData: FormData): File[] {
  return formData
    .getAll("files")
    .filter((f): f is File => f instanceof File && f.size > 0);
}

async function resolvePostCategory(
  boardKey: string,
  boardCategories: string[],
  rawCat: string,
): Promise<string | null> {
  if (!rawCat) return null;
  if (boardCategories.includes(rawCat)) return rawCat;
  if (boardKey === "products") {
    const pc = await prisma.productCategory.findFirst({
      where: { boardKey, name: rawCat },
    });
    if (pc) return pc.name;
  }
  return null;
}

function parseAnabadaFields(boardKey: string, formData: FormData) {
  if (boardKey !== "anabada") return {};
  const priceRaw = String(formData.get("price") ?? "").trim();
  const parsed = priceRaw ? parseInt(priceRaw.replace(/,/g, ""), 10) : null;
  const saleStatus = String(formData.get("saleStatus") ?? "selling");
  const valid = ["selling", "reserved", "completed"] as const;
  return {
    price: parsed != null && !Number.isNaN(parsed) ? parsed : null,
    saleStatus: valid.includes(saleStatus as (typeof valid)[number])
      ? saleStatus
      : "selling",
  };
}

async function saveAll(
  files: File[],
  audit?: { userId?: string },
): Promise<SavedFile[]> {
  const saved: SavedFile[] = [];
  try {
    for (const file of files) {
      saved.push(await saveUploadedFile(file, { userId: audit?.userId }));
    }
    return saved;
  } catch (e) {
    await Promise.all(saved.map((s) => deleteStoredFile(s.storageKey)));
    throw e;
  }
}

// ──────────────────────────────────────────────
// 게시글 작성
// ──────────────────────────────────────────────
export async function createPostAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (!session?.user) return { error: "로그인이 필요합니다." };

  const boardKey = String(formData.get("boardKey") ?? "");
  const board = await prisma.board.findUnique({ where: { key: boardKey } });
  if (!board) return { error: "존재하지 않는 게시판입니다." };

  if (!canWriteBoard(session.user.role, board.writeRoles)) {
    return { error: "이 게시판에 글을 작성할 권한이 없습니다." };
  }

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "제목을 입력하세요." };

  const contentRaw = String(formData.get("content") ?? "");
  if (plainTextLength(contentRaw) === 0) {
    return { error: "내용을 입력하세요." };
  }

  const rawCat = String(formData.get("category") ?? "");
  const category = await resolvePostCategory(boardKey, board.categories, rawCat);
  const anabada = parseAnabadaFields(boardKey, formData);

  const files = pickFiles(formData);
  if (files.length > MAX_FILES) {
    return { error: `첨부파일은 최대 ${MAX_FILES}개까지 가능합니다.` };
  }

  let saved: SavedFile[];
  try {
    saved = await saveAll(files, { userId: session.user.id });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "파일 업로드 실패" };
  }

  let postId: string;
  try {
    const post = await prisma.post.create({
      data: {
        boardId: board.id,
        authorId: session.user.id,
        title,
        content: sanitizeRichText(contentRaw),
        category,
        ...anabada,
        attachments: {
          create: saved.map((s) => ({
            filename: s.filename,
            storageKey: s.storageKey,
            mimeType: s.mimeType,
            size: s.size,
          })),
        },
      },
      select: { id: true },
    });
    postId = post.id;

    // 첨부파일 v1 버전 이력 기록
    if (saved.length > 0) {
      const attachments = await prisma.attachment.findMany({
        where: { postId },
        select: { id: true, filename: true, storageKey: true, mimeType: true, size: true },
      });
      if (attachments.length > 0) {
        await prisma.attachmentVersion.createMany({
          data: attachments.map((a) => ({
            attachmentId: a.id,
            version: 1,
            filename: a.filename,
            storageKey: a.storageKey,
            mimeType: a.mimeType,
            size: a.size,
            uploadedById: session.user.id,
            note: "최초 업로드",
          })),
        });
      }
    }
  } catch {
    await Promise.all(saved.map((s) => deleteStoredFile(s.storageKey)));
    return { error: "게시글 저장에 실패했습니다." };
  }

  reindexPost(postId);
  revalidatePath(`/boards/${boardKey}`);
  redirect(`/boards/${boardKey}/${postId}`);
}

// ──────────────────────────────────────────────
// 게시글 수정
// ──────────────────────────────────────────────
export async function updatePostAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (!session?.user) return { error: "로그인이 필요합니다." };

  const postId = String(formData.get("postId") ?? "");
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: { board: true, attachments: true },
  });
  if (!post) return { error: "존재하지 않는 게시글입니다." };

  if (!canManagePost(session.user, post.authorId)) {
    return { error: "수정 권한이 없습니다." };
  }

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "제목을 입력하세요." };

  const contentRaw = String(formData.get("content") ?? "");
  if (plainTextLength(contentRaw) === 0) {
    return { error: "내용을 입력하세요." };
  }

  const rawCat = String(formData.get("category") ?? "");
  const category = await resolvePostCategory(
    post.board.key,
    post.board.categories,
    rawCat,
  );
  const anabada = parseAnabadaFields(post.board.key, formData);

  const removeIds = new Set(
    formData.getAll("removeAttachmentIds").map((v) => String(v)),
  );
  const toRemove = post.attachments.filter((a) => removeIds.has(a.id));
  const remaining = post.attachments.length - toRemove.length;

  const files = pickFiles(formData);
  if (remaining + files.length > MAX_FILES) {
    return { error: `첨부파일은 최대 ${MAX_FILES}개까지 가능합니다.` };
  }

  let saved: SavedFile[];
  try {
    saved = await saveAll(files, { userId: session.user.id });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "파일 업로드 실패" };
  }

  try {
    await prisma.$transaction([
      prisma.post.update({
        where: { id: post.id },
        data: {
          title,
          content: sanitizeRichText(contentRaw),
          category,
          ...anabada,
        },
      }),
      ...(toRemove.length
        ? [
            prisma.attachment.deleteMany({
              where: { id: { in: toRemove.map((a) => a.id) }, postId: post.id },
            }),
          ]
        : []),
      ...(saved.length
        ? [
            prisma.attachment.createMany({
              data: saved.map((s) => ({
                postId: post.id,
                filename: s.filename,
                storageKey: s.storageKey,
                mimeType: s.mimeType,
                size: s.size,
              })),
            }),
          ]
        : []),
    ]);
  } catch {
    await Promise.all(saved.map((s) => deleteStoredFile(s.storageKey)));
    return { error: "게시글 수정에 실패했습니다." };
  }

  // 트랜잭션 성공 후 실제 파일 삭제
  await Promise.all(toRemove.map((a) => deleteStoredFile(a.storageKey)));

  reindexPost(post.id);
  revalidatePath(`/boards/${post.board.key}`);
  revalidatePath(`/boards/${post.board.key}/${post.id}`);
  redirect(`/boards/${post.board.key}/${post.id}`);
}

// ──────────────────────────────────────────────
// 게시글 삭제
// ──────────────────────────────────────────────
export async function deletePostAction(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const postId = String(formData.get("postId") ?? "");
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: { board: { select: { key: true } }, attachments: true },
  });
  if (!post) redirect("/dashboard");

  if (!canManagePost(session.user, post.authorId)) {
    redirect(`/boards/${post.board.key}/${post.id}`);
  }

  await prisma.post.delete({ where: { id: post.id } });
  await Promise.all(post.attachments.map((a) => deleteStoredFile(a.storageKey)));

  void removePost(post.id).catch((e) =>
    console.error("[ai/ingest] 게시글 색인 삭제 실패:", post.id, e),
  );
  revalidatePath(`/boards/${post.board.key}`);
  redirect(`/boards/${post.board.key}`);
}

// ──────────────────────────────────────────────
// 댓글 작성
// ──────────────────────────────────────────────
export async function addCommentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (!session?.user) return { error: "로그인이 필요합니다." };

  const postId = String(formData.get("postId") ?? "");
  const content = sanitizePlainText(String(formData.get("content") ?? "")).trim();
  if (!content) return { error: "댓글 내용을 입력하세요." };

  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: {
      board: { select: { key: true, name: true, allowComments: true } },
      author: { select: { id: true } },
    },
  });
  if (!post) return { error: "존재하지 않는 게시글입니다." };
  if (!post.board.allowComments) {
    return { error: "댓글을 작성할 수 없는 게시판입니다." };
  }

  await prisma.comment.create({
    data: { postId: post.id, authorId: session.user.id, content },
  });

  if (post.authorId !== session.user.id) {
    const { createNotification } = await import("@/features/notifications/service");
    await createNotification({
      userId: post.authorId,
      type: "COMMENT",
      title: `「${post.board.name}」 새 댓글`,
      body: `${session.user.name ?? "사용자"}: ${content.slice(0, 80)}`,
      link: `/boards/${post.board.key}/${post.id}#comments`,
    });
  }

  revalidatePath(`/boards/${post.board.key}/${post.id}`);
  return { ok: true, error: null };
}

// ──────────────────────────────────────────────
// 댓글 삭제
// ──────────────────────────────────────────────
export async function deleteCommentAction(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const commentId = String(formData.get("commentId") ?? "");
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    include: { post: { include: { board: { select: { key: true } } } } },
  });
  if (!comment) return;

  if (!canManagePost(session.user, comment.authorId)) return;

  await prisma.comment.delete({ where: { id: comment.id } });
  revalidatePath(`/boards/${comment.post.board.key}/${comment.postId}`);
}
