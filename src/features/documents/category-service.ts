/**
 * 하위 호환 re-export — DocumentCategory → DocumentBox
 */
export {
  listDocumentBoxes as listDocumentCategories,
  listDocumentBoxes,
  getDocumentBoxById,
  getDocumentBoxBySlug,
  getDocumentBoxTree,
  createDocumentBox,
  updateDocumentBox,
  deleteDocumentBox,
  ensureDefaultDocumentBoxes,
  ensureFrenchMaisonTree,
  isDocumentBoxManager,
  isManagerOfDocumentBox,
} from "@/features/documents/box-service";

/** @deprecated use createDocumentBox */
export async function createDocumentCategory(data: {
  name: string;
  slug: string;
  description?: string;
}) {
  const { createDocumentBox } = await import("@/features/documents/box-service");
  return createDocumentBox(data);
}

/** @deprecated use updateDocumentBox */
export async function updateDocumentCategory(
  id: string,
  data: Partial<{ name: string; slug: string; description: string | null; sortOrder: number }>,
) {
  const { updateDocumentBox } = await import("@/features/documents/box-service");
  return updateDocumentBox(id, data);
}

/** @deprecated use deleteDocumentBox */
export async function deleteDocumentCategory(id: string) {
  const { deleteDocumentBox } = await import("@/features/documents/box-service");
  return deleteDocumentBox(id);
}
