"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { Role } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/session";
import { writeAudit } from "@/lib/audit/service";
import { ensureBoardPageLayouts } from "@/features/page-layout/service";

export type BoardAdminState = {
  ok?: boolean;
  error?: string;
};

const ROLES: Role[] = ["HEADQUARTER", "DEALER", "ADMIN"];

const boardSchema = z.object({
  key: z
    .string()
    .min(2)
    .max(40)
    .regex(/^[a-z][a-z0-9_-]*$/, "영문 소문자로 시작하는 키만 가능합니다."),
  name: z.string().min(1).max(80),
  description: z.string().max(300).optional(),
  categories: z.array(z.string().min(1).max(40)).max(30),
  writeRoles: z.array(z.enum(["HEADQUARTER", "DEALER", "ADMIN"])),
  allowComments: z.boolean(),
});

function parseCategories(raw: string): string[] {
  return raw
    .split(/[,，\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseWriteRoles(formData: FormData): Role[] {
  return formData
    .getAll("writeRoles")
    .map(String)
    .filter((r): r is Role => (ROLES as string[]).includes(r));
}

export async function createBoardAction(
  _prev: BoardAdminState,
  formData: FormData,
): Promise<BoardAdminState> {
  const admin = await requireRole(["ADMIN"]);
  const parsed = boardSchema.safeParse({
    key: String(formData.get("key") ?? "").trim().toLowerCase(),
    name: String(formData.get("name") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim() || undefined,
    categories: parseCategories(String(formData.get("categories") ?? "")),
    writeRoles: parseWriteRoles(formData),
    allowComments: formData.get("allowComments") === "on",
  });
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "입력값을 확인하세요." };
  }

  const exists = await prisma.board.findUnique({
    where: { key: parsed.data.key },
  });
  if (exists) return { error: "이미 존재하는 게시판 키입니다." };

  const maxOrder = await prisma.board.aggregate({ _max: { sortOrder: true } });
  const sortOrder = (maxOrder._max.sortOrder ?? 0) + 10;

  await prisma.board.create({
    data: {
      key: parsed.data.key,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      categories: parsed.data.categories,
      writeRoles: parsed.data.writeRoles,
      allowComments: parsed.data.allowComments,
      sortOrder,
    },
  });

  try {
    await ensureBoardPageLayouts();
  } catch {
    /* optional */
  }

  void writeAudit({
    action: "SITE_CUSTOMIZE",
    userId: admin.id,
    detail: `board_create key=${parsed.data.key}`,
  });

  revalidatePath("/admin/boards");
  revalidatePath(`/boards/${parsed.data.key}`);
  revalidatePath("/", "layout");
  redirect(`/admin/boards/${parsed.data.key}`);
}

export async function updateBoardAction(
  _prev: BoardAdminState,
  formData: FormData,
): Promise<BoardAdminState> {
  const admin = await requireRole(["ADMIN"]);
  const key = String(formData.get("key") ?? "").trim();
  if (!key) return { error: "게시판 키가 필요합니다." };

  const parsed = boardSchema
    .omit({ key: true })
    .safeParse({
      name: String(formData.get("name") ?? "").trim(),
      description: String(formData.get("description") ?? "").trim() || undefined,
      categories: parseCategories(String(formData.get("categories") ?? "")),
      writeRoles: parseWriteRoles(formData),
      allowComments: formData.get("allowComments") === "on",
    });
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "입력값을 확인하세요." };
  }

  const board = await prisma.board.findUnique({ where: { key } });
  if (!board) return { error: "게시판을 찾을 수 없습니다." };

  await prisma.board.update({
    where: { key },
    data: {
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      categories: parsed.data.categories,
      writeRoles: parsed.data.writeRoles,
      allowComments: parsed.data.allowComments,
    },
  });

  void writeAudit({
    action: "SITE_CUSTOMIZE",
    userId: admin.id,
    detail: `board_update key=${key}`,
  });

  revalidatePath("/admin/boards");
  revalidatePath(`/admin/boards/${key}`);
  revalidatePath(`/boards/${key}`);
  revalidatePath("/", "layout");
  return { ok: true };
}

/** 게시판 사이드바·목록 위치(순서) 변경 */
export async function moveBoardAction(formData: FormData): Promise<void> {
  await requireRole(["ADMIN"]);
  const key = String(formData.get("key") ?? "").trim();
  const direction = String(formData.get("direction") ?? "");
  if (!key || (direction !== "up" && direction !== "down")) return;

  const boards = await prisma.board.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, key: true, sortOrder: true },
  });
  const idx = boards.findIndex((b) => b.key === key);
  if (idx < 0) return;
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= boards.length) return;

  const ordered = [...boards];
  const a = ordered[idx]!;
  const b = ordered[swapIdx]!;
  ordered[idx] = b;
  ordered[swapIdx] = a;

  await prisma.$transaction(
    ordered.map((board, i) =>
      prisma.board.update({
        where: { id: board.id },
        data: { sortOrder: (i + 1) * 10 },
      }),
    ),
  );

  revalidatePath("/admin/boards");
  revalidatePath("/", "layout");
}

export async function deleteBoardAction(formData: FormData): Promise<void> {
  const admin = await requireRole(["ADMIN"]);
  const key = String(formData.get("key") ?? "").trim();
  if (!key) return;

  const board = await prisma.board.findUnique({
    where: { key },
    include: { _count: { select: { posts: true } } },
  });
  if (!board) return;

  if (board._count.posts > 0) {
    throw new Error("게시글이 있는 게시판은 삭제할 수 없습니다.");
  }

  await prisma.$transaction([
    prisma.postMailItem.deleteMany({ where: { boardId: board.id } }),
    prisma.postLabel.deleteMany({ where: { boardId: board.id } }),
    prisma.postFolder.deleteMany({ where: { boardId: board.id } }),
    prisma.board.delete({ where: { id: board.id } }),
  ]);

  void writeAudit({
    action: "SITE_CUSTOMIZE",
    userId: admin.id,
    detail: `board_delete key=${key}`,
  });

  revalidatePath("/admin/boards");
  revalidatePath("/", "layout");
}

export async function adminDeleteMailboxFolderAction(formData: FormData) {
  const admin = await requireRole(["ADMIN"]);
  const folderId = String(formData.get("folderId") ?? "");
  const boardKey = String(formData.get("boardKey") ?? "");
  if (!folderId) return { error: "폴더 ID가 필요합니다." };

  await prisma.postFolder.delete({ where: { id: folderId } });
  void writeAudit({
    action: "SITE_CUSTOMIZE",
    userId: admin.id,
    detail: `mailbox_folder_delete id=${folderId}`,
  });
  revalidatePath(`/admin/boards/${boardKey}`);
  return { ok: true };
}

export async function adminDeleteMailboxLabelAction(formData: FormData) {
  const admin = await requireRole(["ADMIN"]);
  const labelId = String(formData.get("labelId") ?? "");
  const boardKey = String(formData.get("boardKey") ?? "");
  if (!labelId) return { error: "라벨 ID가 필요합니다." };

  await prisma.postLabel.delete({ where: { id: labelId } });
  void writeAudit({
    action: "SITE_CUSTOMIZE",
    userId: admin.id,
    detail: `mailbox_label_delete id=${labelId}`,
  });
  revalidatePath(`/admin/boards/${boardKey}`);
  return { ok: true };
}

export async function adminPurgeMailboxTrashAction(formData: FormData) {
  const admin = await requireRole(["ADMIN"]);
  const boardKey = String(formData.get("boardKey") ?? "");
  const board = await prisma.board.findUnique({ where: { key: boardKey } });
  if (!board) return { error: "게시판을 찾을 수 없습니다." };

  const result = await prisma.postMailItem.deleteMany({
    where: { boardId: board.id, trashedAt: { not: null } },
  });

  void writeAudit({
    action: "SITE_CUSTOMIZE",
    userId: admin.id,
    detail: `mailbox_purge_trash key=${boardKey} count=${result.count}`,
  });
  revalidatePath(`/admin/boards/${boardKey}`);
  revalidatePath(`/boards/${boardKey}/mailbox`);
  return { ok: true, count: result.count };
}

/** 관리자: 게시판의 게시글 삭제 */
export async function adminDeletePostAction(
  boardKeyOrForm: string | FormData,
  postIdArg?: string,
) {
  const admin = await requireRole(["ADMIN"]);
  let postId: string;
  let boardKey: string;
  if (typeof boardKeyOrForm === "string") {
    boardKey = boardKeyOrForm;
    postId = postIdArg ?? "";
  } else {
    postId = String(boardKeyOrForm.get("postId") ?? "");
    boardKey = String(boardKeyOrForm.get("boardKey") ?? "");
  }
  if (!postId) return { error: "게시글 ID가 필요합니다." };

  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: { board: { select: { key: true } }, attachments: true },
  });
  if (!post) return { error: "게시글을 찾을 수 없습니다." };

  await prisma.post.delete({ where: { id: postId } });

  void writeAudit({
    action: "SITE_CUSTOMIZE",
    userId: admin.id,
    detail: `post_delete id=${postId} board=${post.board.key}`,
  });

  revalidatePath(`/admin/boards/${boardKey || post.board.key}`);
  revalidatePath(`/boards/${post.board.key}`);
  return { ok: true };
}
