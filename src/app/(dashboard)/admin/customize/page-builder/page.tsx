import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { GrapesEditor } from "@/features/page-layout/components/grapes-editor";
import { requirePageBuilderAccess } from "@/features/page-layout/permissions";
import { getPageBuilderEditorData } from "@/features/page-layout/service";

export const metadata: Metadata = {
  title: "Visual Page Builder",
};

export default async function PageBuilderPage() {
  const { user, access } = await requirePageBuilderAccess();
  const data = await getPageBuilderEditorData(user);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Visual Page Builder"
        description={
          access.isReadOnly
            ? "본사 미리보기 전용 — 레이아웃 조회·템플릿 미리보기만 가능합니다. 저장은 관리자(ADMIN) 또는 대리점(DEALER) 계정으로 진행하세요."
            : data.access.isHqAdmin
              ? "본사·대리점 레이아웃 편집. 템플릿 갤러리, Undo/Redo, 게시글별 상세, 거래 모듈 블록, 3버전 백업."
              : "자사 대리점 레이아웃만 편집할 수 있습니다. 본사 global 레이아웃은 읽기 전용 fallback으로 적용됩니다."
        }
      />
      <GrapesEditor {...data} />
    </div>
  );
}
