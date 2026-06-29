"use client";

interface TemplateHtmlPreviewProps {
  html: string | null;
  css?: string | null;
  emoji?: string | null;
}

export function TemplateHtmlPreview({ html, css, emoji }: TemplateHtmlPreviewProps) {
  if (!html?.trim()) {
    return (
      <div className="flex h-28 w-32 shrink-0 items-center justify-center rounded-lg border bg-muted/30 text-3xl shadow-inner">
        {emoji ?? "📄"}
      </div>
    );
  }

  return (
    <div className="relative h-28 w-32 shrink-0 overflow-hidden rounded-lg border bg-white shadow-inner">
      {css && (
        <style
          dangerouslySetInnerHTML={{
            __html: css.replace(/@import\b[^;]*;/gi, ""),
          }}
        />
      )}
      <div
        className="pointer-events-none origin-top-left scale-[0.2] p-3"
        style={{ width: "500%", minHeight: "500%" }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/90 to-transparent px-1.5 py-1">
        <span className="text-[9px] font-medium text-muted-foreground">미리보기</span>
      </div>
    </div>
  );
}
