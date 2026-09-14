"use client";

import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { MindmapNode, NewsMindmapPayload } from "@/lib/news/mindmap-types";

function downloadText(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function safeFileBase(title: string) {
  return title.replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, "-").slice(0, 40);
}

function TreeNode({ node, depth = 0 }: { node: MindmapNode; depth?: number }) {
  return (
    <li>
      <div
        className={
          depth === 0
            ? "rounded-lg bg-amber-100 px-3 py-1.5 text-sm font-semibold text-amber-950 dark:bg-amber-950 dark:text-amber-100"
            : depth === 1
              ? "font-medium text-foreground"
              : "text-muted-foreground"
        }
      >
        {node.label}
        {node.source ? (
          <span className="ml-1 text-[10px] text-muted-foreground">
            [{node.source}]
          </span>
        ) : null}
      </div>
      {node.children && node.children.length > 0 && (
        <ul className="ml-3 mt-1 space-y-1 border-l border-amber-200/80 pl-3 dark:border-amber-900">
          {node.children.map((c, i) => (
            <TreeNode key={`${c.label}-${i}`} node={c} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

export function NewsMindmapView({ mindmap }: { mindmap: NewsMindmapPayload }) {
  const base = safeFileBase(mindmap.title || "news-mindmap");

  return (
    <div className="mt-2 space-y-3 rounded-xl border border-amber-200/70 bg-background p-3 text-left dark:border-amber-900">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-amber-800 dark:text-amber-200">
            뉴스 마인드맵
          </p>
          <p className="text-[11px] text-muted-foreground">
            {mindmap.periodLabel} · {mindmap.articleCount}건 · XMind 등은
            OPML/Markdown 가져오기
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              downloadText(`${base}.md`, mindmap.markdown, "text/markdown")
            }
          >
            <Download className="h-3.5 w-3.5" />
            Markdown
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              downloadText(
                `${base}.opml`,
                mindmap.opml,
                "text/x-opml",
              )
            }
          >
            <Download className="h-3.5 w-3.5" />
            OPML
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              downloadText(`${base}.mmd`, mindmap.mermaid, "text/plain")
            }
          >
            <Download className="h-3.5 w-3.5" />
            Mermaid
          </Button>
        </div>
      </div>
      <ul className="space-y-1 text-sm">
        <TreeNode node={mindmap.tree} />
      </ul>
    </div>
  );
}
