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

      <div className="page-builder-chrome p-1">
        <GrapesEditor {...data} />
      </div>
    </div>
  );
}
