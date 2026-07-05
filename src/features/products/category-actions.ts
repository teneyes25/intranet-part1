"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

function slugify(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9가-힣-]/g, "")
    .slice(0, 48) || `cat-${Date.now().toString(36)}`;
}

function revalidate(boardKey: string) {
  revalidatePath(`/boards/${boardKey}`);
  revalidatePath("/admin/product-categories");
}

export async function createProductCategoryAction(formData: FormData) {
  await requireRole(["ADMIN", "HEADQUARTER"]);
  const boardKey = String(formData.get("boardKey") ?? "products");
  const name = String(formData.get("name") ?? "").trim();
  const parentId = String(formData.get("parentId") ?? "").trim() || null;
  if (!name) return { error: "카테고리 이름을 입력하세요." };

  const slug = slugify(name);
  const maxOrder = await prisma.productCategory.aggregate({
    where: { boardKey, parentId },
    _max: { sortOrder: true },
  });

  try {
    await prisma.productCategory.create({
      data: {
        boardKey,
        name,
        slug,
        parentId,
        sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
      },
    });
  } catch {
    return { error: "이미 존재하는 slug입니다." };
  }

  revalidate(boardKey);
  return { ok: true };
}

export async function updateProductCategoryAction(id: string, formData: FormData) {
  await requireRole(["ADMIN", "HEADQUARTER"]);
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "이름을 입력하세요." };
  const row = await prisma.productCategory.update({
    where: { id },
    data: { name },
  });
  revalidate(row.boardKey);
  return { ok: true };
}

export async function deleteProductCategoryAction(id: string) {
  await requireRole(["ADMIN", "HEADQUARTER"]);
  const cat = await prisma.productCategory.findUnique({ where: { id } });
  if (!cat) return { error: "카테고리를 찾을 수 없습니다." };
  const childCount = await prisma.productCategory.count({ where: { parentId: id } });
  if (childCount > 0) return { error: "하위 카테고리가 있어 삭제할 수 없습니다." };

  await prisma.productCategory.delete({ where: { id } });
  revalidate(cat.boardKey);
  return { ok: true };
}

export async function reorderProductCategoriesAction(
  boardKey: string,
  orderedIds: string[],
) {
  await requireRole(["ADMIN", "HEADQUARTER"]);
  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.productCategory.update({
        where: { id },
        data: { sortOrder: index + 1 },
      }),
    ),
  );
  revalidate(boardKey);
  return { ok: true };
}

export async function listProductCategoriesFlat(boardKey = "products") {
  return prisma.productCategory.findMany({
    where: { boardKey },
    orderBy: [{ parentId: "asc" }, { sortOrder: "asc" }],
  });
}
