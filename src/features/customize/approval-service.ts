import "server-only";

import { prisma } from "@/lib/prisma";
import { sanitizeRichText } from "@/lib/sanitize";

export function listApprovalTemplates() {
  return prisma.approvalTemplate.findMany({ orderBy: { createdAt: "asc" } });
}

export async function createApprovalTemplate(data: {
  key: string;
  name: string;
  description?: string;
  content: string;
}) {
  return prisma.approvalTemplate.create({
    data: {
      key: data.key.trim(),
      name: data.name.trim(),
      description: data.description?.trim() || null,
      content: sanitizeRichText(data.content),
    },
  });
}

export async function updateApprovalTemplate(
  id: string,
  data: Partial<{ name: string; description: string; content: string }>,
) {
  return prisma.approvalTemplate.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name.trim() }),
      ...(data.description !== undefined && {
        description: data.description.trim() || null,
      }),
      ...(data.content !== undefined && { content: sanitizeRichText(data.content) }),
    },
  });
}

export function deleteApprovalTemplate(id: string) {
  return prisma.approvalTemplate.delete({ where: { id } });
}

export function listApprovalLineTemplates() {
  return prisma.approvalLineTemplate.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
}

export async function createApprovalLineTemplate(data: {
  name: string;
  department?: string;
  targetRole?: string | null;
  steps: unknown;
  isDefault?: boolean;
}) {
  if (data.isDefault) {
    await prisma.approvalLineTemplate.updateMany({
      data: { isDefault: false },
      where: { isDefault: true },
    });
  }
  return prisma.approvalLineTemplate.create({
    data: {
      name: data.name.trim(),
      department: data.department?.trim() || null,
      targetRole: data.targetRole as "ADMIN" | "HEADQUARTER" | "DEALER" | null,
      steps: data.steps as object,
      isDefault: data.isDefault ?? false,
    },
  });
}

export async function updateApprovalLineTemplate(
  id: string,
  data: Partial<{
    name: string;
    department: string;
    targetRole: string | null;
    steps: unknown;
    isDefault: boolean;
  }>,
) {
  if (data.isDefault) {
    await prisma.approvalLineTemplate.updateMany({
      data: { isDefault: false },
      where: { isDefault: true, NOT: { id } },
    });
  }
  return prisma.approvalLineTemplate.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name.trim() }),
      ...(data.department !== undefined && {
        department: data.department.trim() || null,
      }),
      ...(data.targetRole !== undefined && {
        targetRole: data.targetRole as "ADMIN" | "HEADQUARTER" | "DEALER" | null,
      }),
      ...(data.steps !== undefined && { steps: data.steps as object }),
      ...(data.isDefault !== undefined && { isDefault: data.isDefault }),
    },
  });
}

export function deleteApprovalLineTemplate(id: string) {
  return prisma.approvalLineTemplate.delete({ where: { id } });
}
