import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { DocumentBoxManager } from "@/features/documents/components/document-box-manager";
import {
  ensureFrenchMaisonTree,
  isDocumentBoxManager,
  listDocumentBoxes,
} from "@/features/documents/box-service";
import { canManageDocumentBoxes } from "@/features/documents/permissions";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "문서함 관리" };

export default async function AdminDocumentBoxesPage() {
  const user = await requireUser();
  const designated = await isDocumentBoxManager(user.id);
  if (!canManageDocumentBoxes({ role: user.role, isDesignatedManager: designated })) {
    redirect("/documents");
  }

  await ensureFrenchMaisonTree();

  const [boxes, candidates] = await Promise.all([
    listDocumentBoxes(),
    prisma.user.findMany({
      where: { isActive: true, approvalStatus: "APPROVED", role: { not: "ADMIN" } },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: "asc" },
      take: 200,
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="문서함 관리"
        description="문서함의 보존기간·분류·분류번호와 지정 관리자를 설정합니다. 문서함 생성 시 하위 게시판(기안문/자료)이 함께 만들어집니다."
      />
      <DocumentBoxManager
        boxes={boxes}
        candidates={candidates}
        canAssignManagers={user.role === "ADMIN"}
      />
    </div>
  );
}
