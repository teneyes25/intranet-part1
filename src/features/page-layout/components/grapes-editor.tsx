"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { ArrowLeft, Building2, Eye, FileText, Loader2, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Editor } from "grapesjs";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { loadPageLayoutAction, savePageLayoutAction } from "@/features/page-layout/actions";
import { usePageBuilderCollaboration } from "@/features/firebase/hooks/use-page-builder-collaboration";
import { useSession } from "next-auth/react";
import { PageBuilderToolbar } from "@/features/page-layout/components/page-builder-toolbar";
import { PageBuilderPreviewSheet } from "@/features/page-layout/components/page-builder-preview-sheet";
import {
  applyThemeToEditor,
  getGrapesEditorOptions,
  registerAllPageBuilderBlocks,
} from "@/features/page-layout/grapes-blocks";
import {
  GLOBAL_LAYOUT_SCOPE,
  LEGACY_PR_SLUG,
  type PageBuilderEditorData,
  type PageLayoutRecord,
  type PageThemeRecord,
} from "@/features/page-layout/types";

import "grapesjs/dist/css/grapes.min.css";
import "@/features/page-layout/grapes-editor.css";

type GrapesEditorProps = PageBuilderEditorData;

function loadLayoutIntoEditor(editor: Editor, layout: PageLayoutRecord | null) {
  const pd = layout?.projectData;
  const storedCss =
    typeof pd?.storedCss === "string" ? pd.storedCss : (layout?.css ?? "");

  if (pd && Object.keys(pd).length > 0) {
    try {
      editor.loadProjectData(pd);
      editor.setStyle(storedCss);
      return;
    } catch {
      /* fallback */
    }
  }
  if (layout?.html) {
    editor.setComponents(layout.html);
    editor.setStyle(layout.css ?? "");
  } else {
    editor.setComponents("");
    editor.setStyle("");
  }
}

function sortLayoutSlugs(slugs: string[]) {
  return [...slugs]
    .filter((s) => s !== LEGACY_PR_SLUG)
    .sort((a, b) => {
      const core = ["dashboard", "banner"];
      const ai = core.indexOf(a);
      const bi = core.indexOf(b);
      if (ai >= 0 && bi >= 0) return ai - bi;
      if (ai >= 0) return -1;
      if (bi >= 0) return 1;
      if (a.startsWith("board:") && b.startsWith("post-detail:")) return -1;
      if (a.startsWith("post-detail:") && b.startsWith("board:")) return 1;
      return a.localeCompare(b, "ko");
    });
}

export function GrapesEditor({
  layouts,
  themes,
  templates,
  slugLabels,
  dealers,
  access,
  postLayoutPosts,
}: GrapesEditorProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const layoutSlugs = useMemo(
    () =>
      sortLayoutSlugs([
        ...new Set([
          ...layouts.map((l) => l.slug),
          ...postLayoutPosts.map((p) => p.slug),
        ]),
      ]),
    [layouts, postLayoutPosts],
  );

  const [slug, setSlug] = useState(layoutSlugs[0] ?? "dashboard");
  const [dealerScope, setDealerScope] = useState(access.defaultDealerScope);
  const [scopeLayout, setScopeLayout] = useState<PageLayoutRecord | null>(null);
  const [themeId, setThemeId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const editorRef = useRef<Editor | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const themeRef = useRef<PageThemeRecord | null>(null);
  const [ready, setReady] = useState(false);
  const [postSearch, setPostSearch] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewCss, setPreviewCss] = useState("");
  const savedSnapshotRef = useRef<string>("");

  const filteredPostLayouts = useMemo(() => {
    const q = postSearch.trim().toLowerCase();
    if (!q) return postLayoutPosts;
    return postLayoutPosts.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.boardKey.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q),
    );
  }, [postLayoutPosts, postSearch]);

  const dealerScopeLabel =
    dealerScope === GLOBAL_LAYOUT_SCOPE
      ? "본사 (global)"
      : (dealers.find((d) => d.id === dealerScope)?.name ?? "자사 대리점");

  const currentTheme =
    themes.find((t) => t.id === themeId) ?? themes.find((t) => t.isDefault) ?? null;
  themeRef.current = currentTheme;

  const refreshPage = useCallback(() => {
    router.refresh();
  }, [router]);

  const captureSnapshot = useCallback((editor: Editor) => {
    return JSON.stringify({
      html: editor.getHtml(),
      css: editor.getCss() ?? "",
    });
  }, []);

  const markSaved = useCallback((editor: Editor) => {
    savedSnapshotRef.current = captureSnapshot(editor);
    setIsDirty(false);
  }, [captureSnapshot]);

  const confirmDiscard = useCallback(() => {
    if (!isDirty || access.isReadOnly) return true;
    return window.confirm(
      "저장하지 않은 변경사항이 있습니다. 이동하면 변경 내용이 사라질 수 있습니다. 계속할까요?",
    );
  }, [isDirty, access.isReadOnly]);

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  usePageBuilderCollaboration({
    slug,
    dealerScope,
    userId: session?.user?.id,
    userName: session?.user?.name ?? "사용자",
    editorRef,
    readOnly: access.isReadOnly,
  });

  useEffect(() => {
    if (access.lockedDealerId) {
      setDealerScope(access.lockedDealerId);
    }
  }, [access.lockedDealerId]);

  useEffect(() => {
    let cancelled = false;
    loadPageLayoutAction(slug, dealerScope).then((r) => {
      if (cancelled) return;
      const layout = r.ok ? (r.layout ?? null) : null;
      setScopeLayout(layout);
      setThemeId(layout?.themeId ?? themes.find((t) => t.isDefault)?.id ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [slug, dealerScope, themes]);

  // 에디터는 1회만 초기화 (slug/scope 변경 시 loadLayoutIntoEditor만 호출)
  useEffect(() => {
    let editor: Editor | null = null;
    let cancelled = false;

    async function init() {
      if (!containerRef.current) return;
      containerRef.current.innerHTML = "";

      const grapesjs = (await import("grapesjs")).default;
      const blocksBasic = (await import("grapesjs-blocks-basic")).default;
      const presetWebpage = (await import("grapesjs-preset-webpage")).default;

      if (cancelled || !containerRef.current) return;

      editor = grapesjs.init({
        ...getGrapesEditorOptions(containerRef.current, themeRef.current),
        plugins: [blocksBasic, presetWebpage],
      });

      registerAllPageBuilderBlocks(editor);
      loadLayoutIntoEditor(editor, scopeLayout);

      editor.on("load", () => {
        applyThemeToEditor(editor!, themeRef.current);
        markSaved(editor!);
      });

      const onChange = () => {
        if (!savedSnapshotRef.current) return;
        setIsDirty(captureSnapshot(editor!) !== savedSnapshotRef.current);
      };
      editor.on("component:add", onChange);
      editor.on("component:remove", onChange);
      editor.on("component:update", onChange);
      editor.on("style:property:update", onChange);

      editorRef.current = editor;
      setReady(true);
    }

    setReady(false);
    init();

    return () => {
      cancelled = true;
      editor?.destroy();
      editorRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 에디터 인스턴스는 마운트 시 1회만 생성
  }, []);

  // slug / dealerScope / layout 변경 시 에디터 내용만 갱신
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || !ready) return;
    loadLayoutIntoEditor(editor, scopeLayout);
    applyThemeToEditor(editor, themeRef.current);
    markSaved(editor);
  }, [slug, dealerScope, scopeLayout, ready, markSaved]);

  useEffect(() => {
    if (editorRef.current && ready) {
      applyThemeToEditor(editorRef.current, currentTheme);
    }
  }, [currentTheme, ready]);

  function save() {
    const editor = editorRef.current;
    if (!editor) return;

    startTransition(async () => {
      const r = await savePageLayoutAction({
        slug,
        projectData: editor.getProjectData() as Record<string, unknown>,
        html: editor.getHtml(),
        css: editor.getCss() ?? "",
        themeId,
        dealerId: dealerScope,
        note: "저장 (자동 백업)",
      });

      if (r.error) toast.error(r.error);
      else {
        toast.success(`${dealerScopeLabel} · ${slugLabels[slug] ?? slug} 저장 완료`);
        markSaved(editor);
        refreshPage();
        const reload = await loadPageLayoutAction(slug, dealerScope);
        if (reload.ok) setScopeLayout(reload.layout ?? null);
      }
    });
  }

  function openPreview() {
    const editor = editorRef.current;
    if (!editor) return;
    setPreviewHtml(editor.getHtml());
    setPreviewCss(editor.getCss() ?? "");
    setPreviewOpen(true);
  }

  function requestSlugChange(next: string) {
    if (next === slug) return;
    if (!confirmDiscard()) return;
    setSlug(next);
  }

  function requestDealerScopeChange(next: string) {
    if (next === dealerScope) return;
    if (!confirmDiscard()) return;
    setDealerScope(next);
  }

  const backHref = access.isHqAdmin ? "/admin/customize" : "/dashboard";
  const backLabel = access.isHqAdmin ? "커스터마이징" : "홈";

  return (
    <div className="grapes-editor-shell flex min-h-[480px] flex-col gap-3 p-2 sm:min-h-[640px] sm:h-[calc(100dvh-14rem)] sm:p-3">
      {access.isReadOnly && (
        <div className="flex flex-col gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-900 dark:text-amber-100 sm:flex-row sm:items-center">
          <Badge variant="outline" className="w-fit border-amber-500/40">
            미리보기 전용
          </Badge>
          <span>본사 계정은 레이아웃을 조회·미리볼 수 있습니다. 저장·적용은 관리자(ADMIN)만 가능합니다.</span>
        </div>
      )}
      <div className="grapes-editor-toolbar-strip flex flex-wrap items-center gap-2 rounded-xl border border-border/50 bg-muted/15 p-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            if (confirmDiscard()) router.push(backHref);
          }}
        >
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </Button>

        {isDirty && !access.isReadOnly && (
          <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-100">
            저장되지 않음
          </Badge>
        )}

        {access.isHqAdmin ? (
          <Select value={dealerScope} onValueChange={requestDealerScopeChange}>
            <SelectTrigger className="h-9 w-[180px] border-brand/20 bg-background">
              <Building2 className="mr-1 h-3.5 w-3.5 text-brand" />
              <SelectValue placeholder="적용 범위" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={GLOBAL_LAYOUT_SCOPE}>본사 (global)</SelectItem>
              {dealers.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div className="flex h-9 items-center gap-1.5 rounded-md border border-brand/20 bg-muted/40 px-3 text-xs text-muted-foreground">
            <Building2 className="h-3.5 w-3.5 text-brand" />
            <span>{dealerScopeLabel} 전용 편집</span>
          </div>
        )}

        <div className="flex max-w-full flex-wrap gap-1">
          {layoutSlugs.map((s) => (
            <Button
              key={s}
              type="button"
              size="sm"
              variant={slug === s ? "default" : "outline"}
              onClick={() => requestSlugChange(s)}
              className="text-xs"
            >
              {slugLabels[s] ?? s}
            </Button>
          ))}
        </div>

        <div className="ml-auto flex shrink-0 flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="min-h-9"
          onClick={openPreview}
          disabled={!ready}
        >
          <Eye className="h-4 w-4" />
          <span className="hidden sm:inline">미리보기</span>
        </Button>

        <Button
          type="button"
          size="sm"
          className="min-h-9 shadow-soft"
          onClick={save}
          disabled={pending || !ready || access.isReadOnly || !isDirty}
          title={
            access.isReadOnly
              ? "미리보기 전용 — 저장 불가"
              : !isDirty
                ? "변경사항 없음"
                : undefined
          }
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          저장
        </Button>
        </div>
      </div>

      {postLayoutPosts.length > 0 && (
        <div className="flex flex-col gap-2 rounded-lg border border-dashed border-border/80 bg-muted/20 px-3 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <FileText className="h-3.5 w-3.5" />
              게시글별 상세
            </span>
            <Input
              value={postSearch}
              onChange={(e) => setPostSearch(e.target.value)}
              placeholder="제목·게시판 검색"
              className="h-7 max-w-[220px] text-xs"
            />
            {postSearch && (
              <span className="text-[11px] text-muted-foreground">
                {filteredPostLayouts.length}건
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {filteredPostLayouts.length === 0 && (
              <p className="text-xs text-muted-foreground">검색 결과가 없습니다.</p>
            )}
            {filteredPostLayouts.slice(0, 16).map((post) => (
              <Button
                key={post.slug}
                type="button"
                size="sm"
                variant={slug === post.slug ? "default" : "secondary"}
                className="h-7 max-w-[200px] truncate text-[11px]"
                onClick={() => requestSlugChange(post.slug)}
                title={`${post.boardKey} · ${post.title}`}
              >
                {post.title}
              </Button>
            ))}
          </div>
        </div>
      )}

      {ready && (
        <PageBuilderToolbar
          slug={slug}
          slugLabel={slugLabels[slug] ?? slug}
          dealerScope={dealerScope}
          dealerScopeLabel={dealerScopeLabel}
          themes={themes}
          templates={templates}
          currentThemeId={themeId}
          versionCount={scopeLayout?.versionCount ?? 0}
          editorRef={editorRef}
          readOnly={access.isReadOnly}
          onThemeApplied={setThemeId}
          onTemplateApplied={refreshPage}
          onVersionRestored={refreshPage}
        />
      )}

      <div className="relative flex-1 overflow-hidden rounded-xl border border-border/60 bg-muted/20 shadow-inner">
        {!ready && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            에디터 로딩 중…
          </div>
        )}
        <div ref={containerRef} className="h-full w-full" />
      </div>

      {scopeLayout?.updatedAt && scopeLayout.updatedAt.getTime() > 0 && (
        <p className="text-xs text-muted-foreground">
          {dealerScopeLabel} · 마지막 저장:{" "}
          {new Intl.DateTimeFormat("ko-KR").format(scopeLayout.updatedAt)}
          {scopeLayout.versionCount > 0 && ` · v${scopeLayout.versionCount}`}
        </p>
      )}

      <PageBuilderPreviewSheet
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        html={previewHtml}
        css={previewCss}
        title={`${dealerScopeLabel} · ${slugLabels[slug] ?? slug}`}
        device={previewDevice}
        onDeviceChange={setPreviewDevice}
      />
    </div>
  );
}
