import type { Metadata } from "next";
import { LayoutPanelLeft, Sparkles } from "lucide-react";

import { PageHero } from "@/components/layout/page-hero";
import { Badge } from "@/components/ui/badge";
import { GrapesEditor } from "@/features/page-layout/components/grapes-editor";
import { requirePageBuilderAccess } from "@/features/page-layout/permissions";
import { getPageBuilderEditorData } from "@/features/page-layout/service";

export const metadata: Metadata = {
  title: "Visual Page Builder",
};

export default async function PageBuilderPage() {
  const { user, access } = await requirePageBuilderAccess();
  const data = await getPageBuilderEditorData(user);

  const description = access.isReadOnly
    ? "본사 미리보기 전용 — 레이아웃 조회·템플릿 미리보기만 가능합니다."
    : data.access.isHqAdmin
      ? "본사·대리점 레이아웃 편집 · 템플릿 · Undo/Redo · 거래 모듈 · 3버전 백업"
      : "자사 대리점 레이아웃만 편집할 수 있습니다.";

  return (
    <div className="page-shell">
      <PageHero
        eyebrow="Visual CMS"
        title="Visual Page Builder"
        description={description}
        badge={access.isReadOnly ? "미리보기" : "편집 가능"}
      >
        <div className="flex flex-wrap gap-2 pt-1">
          <Badge className="border-white/20 bg-white/10 text-white">
            <LayoutPanelLeft className="mr-1 h-3 w-3" />
            GrapesJS
          </Badge>
          <Badge className="border-white/20 bg-white/10 text-white">
            <Sparkles className="mr-1 h-3 w-3" />
            B2B Blocks
          </Badge>
        </div>
      </PageHero>

      {!access.isReadOnly && (
        <div className="page-builder-step-hint">
          <span className="font-semibold text-primary">편집 흐름</span>
          <span>1. 페이지·범위 선택</span>
          <span className="text-border">→</span>
          <span>2. 템플릿 미리보기 / 적용</span>
          <span className="text-border">→</span>
          <span>3. 블록 편집 · 기기 미리보기</span>
          <span className="text-border">→</span>
          <span>
            <strong>4. 저장</strong> (자동 버전 백업)
          </span>
        </div>
      )}

      <div className="page-builder-chrome p-1 sm:p-1.5">
        <GrapesEditor {...data} />
      </div>
    </div>
  );
}
