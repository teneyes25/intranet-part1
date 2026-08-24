"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/session";
import {
  backfillDocumentCategoryLinks,
  createDocumentCategory,
  deleteDocumentCategory,
  updateDocumentCategory,
} from "@/features/documents/category-service";

export async function addDocumentCategoryAction(formData: FormData) {
  await requireRole(["ADMIN"]);

  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!name || !slug) return { error: "이름과 슬러그를 입력하세요." };

  try {
    await createDocumentCategory({ name, slug, description });
    revalidatePath("/admin/document-categories");
    revalidatePath("/documents");
    revalidatePath("/approval/new");
    return { ok: true };
  } catch {
    return { error: "카테고리 생성에 실패했습니다. (슬러그 중복 등)" };
  }
}

export async function updateDocumentCategoryAction(formData: FormData) {
  await requireRole(["ADMIN"]);

  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;

  if (!id || !name) return { error: "이름과 ID가 필요합니다." };

  await updateDocumentCategory(id, { name, description });
  revalidatePath("/admin/document-categories");
  revalidatePath("/documents");
  revalidatePath("/approval/new");
  return { ok: true };
}

export async function deleteDocumentCategoryAction(id: string) {
  await requireRole(["ADMIN"]);
  await deleteDocumentCategory(id);
  revalidatePath("/admin/document-categories");
  revalidatePath("/documents");
  revalidatePath("/approval/new");
}

export async function backfillDocumentCategoriesAction() {
  await requireRole(["ADMIN"]);
  const linked = await backfillDocumentCategoryLinks();
  revalidatePath("/documents");
  revalidatePath("/admin/document-categories");
  return { ok: true, linked };
}
