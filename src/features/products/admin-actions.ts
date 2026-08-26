"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/session";

function slugify(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9가-힣_-]/gi, "")
    .slice(0, 40) || `cat-${Date.now()}`;
}

async function syncBoardCategories(boardKey = "products") {
  const cats = await prisma.productCategory.findMany({
    where: { boardKey },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { name: true },
  });
  const names = [...new Set(cats.map((c) => c.name))];
  await prisma.board.updateMany({
    where: { key: boardKey },
    data: { categories: names },
  });
}

export async function addProductCategoryAction(formData: FormData) {
  await requireRole(["ADMIN"]);
  const name = String(formData.get("name") ?? "").trim();
  const parentId = String(formData.get("parentId") ?? "").trim() || null;
  const boardKey = String(formData.get("boardKey") ?? "products").trim() || "products";
  if (!name) return { error: "이름을 입력하세요." };

  let slug = slugify(name);
  const clash = await prisma.productCategory.findFirst({
    where: { boardKey, slug },
  });
  if (clash) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;

  const total = await prisma.productCategory.count({ where: { boardKey } });
  await prisma.productCategory.create({
    data: {
      boardKey,
      name,
      slug,
      parentId,
      sortOrder: (total + 1) * 10,
    },
  });
  await syncBoardCategories(boardKey);
  revalidatePath("/admin/product-categories");
  revalidatePath(`/boards/${boardKey}`);
  revalidatePath("/admin/boards");
  return { ok: true };
}

export async function updateProductCategoryAction(formData: FormData) {
  await requireRole(["ADMIN"]);
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!id || !name) return { error: "입력값을 확인하세요." };
  const cat = await prisma.productCategory.findUnique({ where: { id } });
  if (!cat) return { error: "카테고리를 찾을 수 없습니다." };
  await prisma.productCategory.update({
    where: { id },
    data: { name },
  });
  await syncBoardCategories(cat.boardKey);
  revalidatePath("/admin/product-categories");
  revalidatePath(`/boards/${cat.boardKey}`);
  return { ok: true };
}

export async function deleteProductCategoryAction(formData: FormData) {
  await requireRole(["ADMIN"]);
  const id = String(formData.get("id") ?? "");
  const cat = await prisma.productCategory.findUnique({
    where: { id },
    include: { _count: { select: { children: true } } },
  });
  if (!cat) return { error: "카테고리를 찾을 수 없습니다." };
  if (cat._count.children > 0) {
    return { error: "하위 카테고리가 있어 삭제할 수 없습니다." };
  }
  await prisma.productCategory.delete({ where: { id } });
  await syncBoardCategories(cat.boardKey);
  revalidatePath("/admin/product-categories");
  revalidatePath(`/boards/${cat.boardKey}`);
  return { ok: true };
}
