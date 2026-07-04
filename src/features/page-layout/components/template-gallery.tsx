"use client";

import { useTransition } from "react";
import { Check, Loader2 } from "lucide-react";
import type { Editor } from "grapesjs";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { applyPageTemplateAction } from "@/features/page-layout/actions";
import { TemplateHtmlPreview } from "@/features/page-layout/components/template-html-preview";
import { loadTemplateIntoEditor } from "@/features/page-layout/grapes-blocks";
import { GLOBAL_LAYOUT_SCOPE } from "@/features/page-layout/types";
import type { PageTemplateRecord } from "@/features/page-layout/types";

const CATEGORY_LABELS: Record<string, string> = {
  dashboard: "대시보드",
  banner: "배너",
  board: "게시판",
  product: "상품",
  event: "이벤트",
  landing: "랜딩",
};

interface TemplateGalleryProps {
  slug: string;
  slugLabel: string;
  dealerScope: string;
  dealerScopeLabel: string;
  templates: PageTemplateRecord[];
  editorRef: React.RefObject<Editor | null>;
  readOnly?: boolean;
  confirmIfDirty?: () => boolean;
  onApplied: () => void;
}

export function TemplateGallery({
  slug,
  slugLabel,
  dealerScope,
  dealerScopeLabel,
  templates,
  editorRef,
  readOnly = false,
  confirmIfDirty,
  onApplied,
}: TemplateGalleryProps) {
  const [pending, startTransition] = useTransition();
  const slugTemplates = templates.filter((t) => t.targetSlug === slug);

  function previewTemplate(template: PageTemplateRecord) {
    if (confirmIfDirty && !confirmIfDirty()) return;
    const editor = editorRef.current;
    if (!editor) return;
    loadTemplateIntoEditor(editor, template);
    toast.success(`"${template.name}" 미리보기 적용 (저장 전)`);
  }

  function applyAndSave(template: PageTemplateRecord) {
    if (readOnly) {
      toast.error("미리보기 전용 계정은 저장할 수 없습니다.");
      return;
    }
    if (confirmIfDirty && !confirmIfDirty()) return;
    const scopeLabel = dealerScope === GLOBAL_LAYOUT_SCOPE ? "본사" : dealerScopeLabel;
    if (
      !confirm(
        `"${template.name}" 템플릿을 ${scopeLabel} · ${slugLabel}에 적용하고 저장할까요?`,
      )
    ) {
      return;
    }

    startTransition(async () => {
      const r = await applyPageTemplateAction(template.id, slug, dealerScope);
      if (r.error) {
        toast.error(r.error);
        return;
      }
      toast.success(`"${template.name}" 템플릿을 ${scopeLabel}에 저장했습니다.`);
      onApplied();
    });
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button type="button" size="sm" variant="default" className="shadow-soft" disabled={pending}>
          템플릿 갤러리
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>템플릿 갤러리</SheetTitle>
          <SheetDescription>
            {slugLabel} · {dealerScope === GLOBAL_LAYOUT_SCOPE ? "본사" : dealerScopeLabel}
            {" · "}미리보기는 저장 전 캔버스에만 반영됩니다.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-3 rounded-lg border border-primary/15 bg-primary/[0.04] px-3 py-2 text-xs text-muted-foreground">
          <strong className="text-foreground">권장 흐름:</strong> 미리보기 → 확인 →{" "}
          <strong className="text-foreground">적용 후 저장</strong>
        </div>
        <div className="mt-4 grid gap-3">
          {slugTemplates.length === 0 && (
            <p className="text-sm text-muted-foreground">이 페이지용 템플릿이 없습니다.</p>
          )}
          {slugTemplates.map((tpl) => (
            <div
              key={tpl.id}
              className="rounded-xl border border-border/80 bg-card p-4 shadow-soft transition hover:border-primary/30 hover:shadow-card"
            >
              <div className="flex items-start gap-3">
                <TemplateHtmlPreview html={tpl.html} css={tpl.css} emoji={tpl.thumbnail} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-foreground">{tpl.name}</p>
                    <Badge variant="secondary" className="text-[10px]">
                      {CATEGORY_LABELS[tpl.category] ?? tpl.category}
                    </Badge>
                    {tpl.dealerId && (
                      <Badge variant="outline" className="text-[10px]">
                        대리점
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{tpl.description}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => previewTemplate(tpl)}
                    >
                      미리보기
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => applyAndSave(tpl)}
                      disabled={pending || readOnly}
                    >
                      {pending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                      적용 후 저장
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
