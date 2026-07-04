"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import {
  History,
  Monitor,
  Redo2,
  Smartphone,
  Tablet,
  Undo2,
} from "lucide-react";
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
import {
  applyPageThemeAction,
  listPageLayoutVersionsAction,
  restorePageLayoutVersionAction,
} from "@/features/page-layout/actions";
import { TemplateGallery } from "@/features/page-layout/components/template-gallery";
import { applyThemeToEditor } from "@/features/page-layout/grapes-blocks";
import {
  MAX_LAYOUT_VERSIONS,
  type DealerScopeOption,
  type PageLayoutVersionRecord,
  type PageTemplateRecord,
  type PageThemeRecord,
} from "@/features/page-layout/types";

const DEVICE_NAMES: Record<string, string> = {
  desktop: "데스크톱",
  tablet: "태블릿",
  mobile: "모바일",
};

interface PageBuilderToolbarProps {
  slug: string;
  slugLabel: string;
  dealerScope: string;
  dealerScopeLabel: string;
  themes: PageThemeRecord[];
  templates: PageTemplateRecord[];
  currentThemeId: string | null;
  versionCount: number;
  editorRef: React.RefObject<Editor | null>;
  readOnly?: boolean;
  confirmIfDirty?: () => boolean;
  onThemeApplied: (themeId: string) => void;
  onTemplateApplied: () => void;
  onVersionRestored: () => void;
}

function VersionList({
  slug,
  dealerScope,
  readOnly,
  onRestore,
}: {
  slug: string;
  dealerScope: string;
  readOnly?: boolean;
  onRestore: (id: string) => void;
}) {
  const [versions, setVersions] = useState<PageLayoutVersionRecord[] | null>(null);

  useEffect(() => {
    listPageLayoutVersionsAction(slug, dealerScope).then((r) => {
      if (r.ok && r.versions) setVersions(r.versions);
      else setVersions([]);
    });
  }, [slug, dealerScope]);

  if (versions === null) {
    return <p className="mt-4 text-sm text-muted-foreground">불러오는 중…</p>;
  }

  if (versions.length === 0) {
    return (
      <p className="mt-4 text-sm text-muted-foreground">
        저장 이력이 없습니다. 첫 저장 후 최대 {MAX_LAYOUT_VERSIONS}개 버전이 보관됩니다.
      </p>
    );
  }

  return (
    <ul className="mt-4 space-y-2">
      {versions.map((v) => (
        <li
          key={v.id}
          className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm"
        >
          <div>
            <p className="font-medium">v{v.version}</p>
            <p className="text-xs text-muted-foreground">
              {new Intl.DateTimeFormat("ko-KR", {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(v.createdAt)}
              {v.note ? ` · ${v.note}` : ""}
            </p>
          </div>
          <Button type="button" size="sm" variant="outline" onClick={() => onRestore(v.id)} disabled={readOnly}>
            복원
          </Button>
        </li>
      ))}
    </ul>
  );
}

export function PageBuilderToolbar({
  slug,
  slugLabel,
  dealerScope,
  dealerScopeLabel,
  themes,
  templates,
  currentThemeId,
  versionCount,
  editorRef,
  readOnly = false,
  confirmIfDirty,
  onThemeApplied,
  onTemplateApplied,
  onVersionRestored,
}: PageBuilderToolbarProps) {
  const [pending, startTransition] = useTransition();
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const refreshUndoState = useCallback(() => {
    const um = editorRef.current?.UndoManager;
    if (!um) return;
    setCanUndo(um.hasUndo());
    setCanRedo(um.hasRedo());
  }, [editorRef]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const handler = () => refreshUndoState();
    editor.on("change:canvasOffset", handler);
    editor.on("component:add", handler);
    editor.on("component:remove", handler);
    editor.on("component:update", handler);
    refreshUndoState();
    return () => {
      editor.off("change:canvasOffset", handler);
      editor.off("component:add", handler);
      editor.off("component:remove", handler);
      editor.off("component:update", handler);
    };
  }, [editorRef, refreshUndoState, slug, dealerScope]);

  function setDevice(deviceId: string) {
    editorRef.current?.setDevice(DEVICE_NAMES[deviceId] ?? deviceId);
  }

  function undo() {
    editorRef.current?.UndoManager.undo();
    refreshUndoState();
  }

  function redo() {
    editorRef.current?.UndoManager.redo();
    refreshUndoState();
  }

  function applyTheme(themeId: string) {
    if (confirmIfDirty && !confirmIfDirty()) return;
    if (readOnly) {
      const theme = themes.find((t) => t.id === themeId) ?? null;
      if (editorRef.current) applyThemeToEditor(editorRef.current, theme);
      toast.message("미리보기 전용 — 테마는 캔버스에만 반영됩니다.");
      return;
    }
    startTransition(async () => {
      const r = await applyPageThemeAction(slug, themeId, dealerScope);
      if (r.error) {
        toast.error(r.error);
        return;
      }
      onThemeApplied(themeId);
      const theme = themes.find((t) => t.id === themeId) ?? null;
      if (editorRef.current) applyThemeToEditor(editorRef.current, theme);
      toast.success("테마가 적용되었습니다.");
    });
  }

  function restoreVersion(versionId: string) {
    if (readOnly) return;
    if (confirmIfDirty && !confirmIfDirty()) return;
    if (!confirm("이 버전으로 복원할까요? 현재 내용은 새 백업으로 저장됩니다.")) return;
    startTransition(async () => {
      const r = await restorePageLayoutVersionAction(slug, versionId, dealerScope);
      if (r.error) {
        toast.error(r.error);
        return;
      }
      toast.success("버전을 복원했습니다.");
      onVersionRestored();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-gradient-to-r from-muted/40 to-muted/10 p-2 shadow-xs">
      <div className="flex items-center gap-0.5 rounded-lg border border-border/70 bg-background p-0.5 shadow-xs">
        <Button type="button" size="sm" variant="ghost" className="h-9 px-2.5" onClick={undo} disabled={!canUndo} title="실행 취소 (Ctrl+Z)">
          <Undo2 className="h-4 w-4" />
          <span className="sr-only sm:not-sr-only sm:ml-1 sm:text-xs">실행 취소</span>
        </Button>
        <Button type="button" size="sm" variant="ghost" className="h-9 px-2.5" onClick={redo} disabled={!canRedo} title="다시 실행">
          <Redo2 className="h-4 w-4" />
          <span className="sr-only sm:not-sr-only sm:ml-1 sm:text-xs">다시 실행</span>
        </Button>
      </div>

      <div className="flex items-center gap-0.5 rounded-lg border border-border/70 bg-background p-0.5 shadow-xs" role="group" aria-label="기기 미리보기">
        <Button type="button" size="sm" variant="ghost" className="h-9 px-2.5" onClick={() => setDevice("desktop")} title="데스크톱">
          <Monitor className="h-4 w-4" />
        </Button>
        <Button type="button" size="sm" variant="ghost" className="h-9 px-2.5" onClick={() => setDevice("tablet")} title="태블릿 820px">
          <Tablet className="h-4 w-4" />
        </Button>
        <Button type="button" size="sm" variant="ghost" className="h-9 px-2.5" onClick={() => setDevice("mobile")} title="모바일 390px">
          <Smartphone className="h-4 w-4" />
        </Button>
      </div>

      <TemplateGallery
        slug={slug}
        slugLabel={slugLabel}
        dealerScope={dealerScope}
        dealerScopeLabel={dealerScopeLabel}
        templates={templates}
        editorRef={editorRef}
        readOnly={readOnly}
        confirmIfDirty={confirmIfDirty}
        onApplied={onTemplateApplied}
      />

      <Sheet>
        <SheetTrigger asChild>
          <Button type="button" size="sm" variant="outline" disabled={pending}>
            테마
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>페이지 테마</SheetTitle>
            <SheetDescription>브랜드 색상 프리셋 · {dealerScopeLabel}</SheetDescription>
          </SheetHeader>
          <div className="mt-4 grid gap-3">
            {themes.map((theme) => (
              <button
                key={theme.id}
                type="button"
                onClick={() => applyTheme(theme.id)}
                className={`rounded-xl border p-4 text-left transition hover:border-brand/40 ${
                  currentThemeId === theme.id ? "border-brand bg-brand-light/10" : ""
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{theme.name}</p>
                  {theme.dealerId && (
                    <Badge variant="outline" className="text-[10px]">
                      대리점
                    </Badge>
                  )}
                  {theme.isDefault && !theme.dealerId && (
                    <Badge variant="secondary" className="text-[10px]">
                      기본
                    </Badge>
                  )}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{theme.description}</p>
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      <Sheet>
        <SheetTrigger asChild>
          <Button type="button" size="sm" variant="outline" disabled={pending}>
            <History className="h-4 w-4" />
            버전
            {versionCount > 0 && (
              <Badge variant="secondary" className="ml-1 text-[10px]">
                {Math.min(versionCount, MAX_LAYOUT_VERSIONS)}
              </Badge>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>버전 이력</SheetTitle>
            <SheetDescription>
              저장 시 자동 백업 · 최대 {MAX_LAYOUT_VERSIONS}버전 · {dealerScopeLabel}
            </SheetDescription>
          </SheetHeader>
          <VersionList slug={slug} dealerScope={dealerScope} readOnly={readOnly} onRestore={restoreVersion} />
        </SheetContent>
      </Sheet>
    </div>
  );
}

export type { DealerScopeOption };
