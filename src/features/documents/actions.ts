"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireRole, requireUser } from "@/lib/auth/session";
import {
  backfillDocumentCategoryLinks,
  createDocumentCategory,
  deleteDocumentCategory,
  updateDocumentCategory,
} from "@/features/documents/category-service";

function revalidateDocs() {
  revalidatePath("/admin/document-categories");
  revalidatePath("/documents");
  revalidatePath("/approval/new");
  revalidatePath("/approval");
}

export async function addDocumentCategoryAction(formData: FormData) {
  await requireRole(["ADMIN"]);

  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const workTypeCode = String(formData.get("workTypeCode") ?? "").trim();
  const retentionYears = Number(formData.get("retentionYears") ?? "") || null;
  const isPublic = formData.get("isPublic") === "on" || formData.get("isPublic") === "true";

  if (!name || !slug) return { error: "이름과 슬러그를 입력하세요." };

  try {
    await createDocumentCategory({
      name,
      slug,
      description,
      workTypeCode: workTypeCode || name,
      ownerId: null,
      retentionYears,
      isPublic,
    });
    revalidateDocs();
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
  const workTypeCode = String(formData.get("workTypeCode") ?? "").trim() || null;
  const retentionRaw = String(formData.get("retentionYears") ?? "").trim();
  const retentionYears = retentionRaw ? Number(retentionRaw) || null : null;
  const isPublic =
    formData.get("isPublic") === "on" || formData.get("isPublic") === "true";

  if (!id || !name) return { error: "이름과 ID가 필요합니다." };

  await updateDocumentCategory(id, {
    name,
    description,
    workTypeCode,
    retentionYears,
    isPublic,
  });
  revalidateDocs();
  return { ok: true };
}

export async function deleteDocumentCategoryAction(
  idOrForm: string | FormData,
) {
  await requireRole(["ADMIN"]);
  let id = "";
  let moveTo: string | null = null;
  if (typeof idOrForm === "string") {
    id = idOrForm;
  } else {
    id = String(idOrForm.get("id") ?? "").trim();
    moveTo = String(idOrForm.get("moveToCategoryId") ?? "").trim() || null;
  }
  if (!id) return { error: "ID가 필요합니다." };
  try {
    await deleteDocumentCategory(id, { moveToCategoryId: moveTo });
    revalidateDocs();
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "삭제 실패" };
  }
}

export async function backfillDocumentCategoriesAction() {
  await requireRole(["ADMIN"]);
  const linked = await backfillDocumentCategoryLinks();
  revalidateDocs();
  return { ok: true, linked };
}

/** 사용자: 내 문서함 추가 */
export async function addMyDocumentFolderAction(formData: FormData) {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const workTypeCode = String(formData.get("workTypeCode") ?? "").trim();
  const retentionYears = Number(formData.get("retentionYears") ?? "") || null;
  const isPublic = formData.get("isPublic") === "on";
  if (!name) return { error: "문서함 이름을 입력하세요." };
  try {
    await createDocumentCategory({
      name,
      slug: `u-${user.id.slice(-6)}-${name}`,
      workTypeCode: workTypeCode || name,
      ownerId: user.id,
      description: "개인 문서함",
      retentionYears,
      isPublic,
    });
    revalidateDocs();
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "추가 실패" };
  }
}

export async function updateMyDocumentFolderAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const workTypeCode = String(formData.get("workTypeCode") ?? "").trim() || null;
  const retentionRaw = String(formData.get("retentionYears") ?? "").trim();
  const retentionYears = retentionRaw ? Number(retentionRaw) || null : null;
  const isPublic = formData.get("isPublic") === "on";
  if (!id || !name) return { error: "입력값을 확인하세요." };
  const cat = await prisma.documentCategory.findUnique({ where: { id } });
  if (!cat || cat.ownerId !== user.id) {
    if (user.role !== "ADMIN") return { error: "본인 문서함만 수정할 수 있습니다." };
  }
  await updateDocumentCategory(id, {
    name,
    workTypeCode,
    retentionYears,
    isPublic,
  });
  revalidateDocs();
  return { ok: true };
}

export async function deleteMyDocumentFolderAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "").trim();
  const moveTo = String(formData.get("moveToCategoryId") ?? "").trim() || null;
  if (!id) return { error: "ID가 필요합니다." };
  const cat = await prisma.documentCategory.findUnique({ where: { id } });
  if (!cat) return { error: "문서함을 찾을 수 없습니다." };
  if (cat.ownerId !== user.id && user.role !== "ADMIN") {
    return { error: "본인 문서함만 삭제할 수 있습니다." };
  }
  if (cat.ownerId === null && user.role !== "ADMIN") {
    return { error: "공용 문서함은 관리자만 삭제할 수 있습니다." };
  }
  try {
    await deleteDocumentCategory(id, { moveToCategoryId: moveTo });
    revalidateDocs();
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "삭제 실패" };
  }
}
