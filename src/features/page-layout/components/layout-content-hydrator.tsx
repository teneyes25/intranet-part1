"use client";

import { useEffect, useMemo, useRef } from "react";

import { CommerceModuleStrip } from "@/features/commerce/components/commerce-module-card";
import { parseCommerceModulesFromHtml } from "@/features/commerce/parse-layout-modules";
import type { CommerceModuleId } from "@/features/commerce/types";

interface LayoutContentHydratorProps {
  html: string;
  className?: string;
}

interface NoticePreview {
  title: string;
  href: string;
  date: string;
}

async function fetchBoardPreview(
  boardKey: string,
  limit: number,
): Promise<NoticePreview[]> {
  try {
    const res = await fetch(
      `/api/boards/${encodeURIComponent(boardKey)}/posts?limit=${limit}`,
      { credentials: "same-origin" },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as {
      items?: { id: string; title: string; createdAt: string }[];
    };
    return (data.items ?? []).map((p) => ({
      title: p.title,
      href: `/boards/${boardKey}/${p.id}`,
      date: new Intl.DateTimeFormat("ko-KR").format(new Date(p.createdAt)),
    }));
  } catch {
    return [];
  }
}

function hydrateDataWidgets(root: HTMLElement) {
  root.querySelectorAll("[data-intranet-widget]").forEach((node) => {
    const el = node as HTMLElement;
    const widget = el.getAttribute("data-intranet-widget") ?? "notices";
    const boardKey = el.getAttribute("data-board-key") ?? widget;
    const limit = Number(el.getAttribute("data-limit") ?? "5");
    const mount = document.createElement("div");
    el.replaceWith(mount);

    void fetchBoardPreview(boardKey, limit).then((items) => {
      const title = widget === "news" ? "뉴스" : "공지사항";
      const list =
        items.length > 0
          ? items
              .map(
                (p) =>
                  `<li class="border-b border-border/50 last:border-0"><a href="${p.href}" class="flex items-center justify-between gap-2 px-4 py-3 text-sm text-foreground hover:bg-muted/40"><span class="truncate">${p.title}</span><span class="shrink-0 text-xs text-muted-foreground">${p.date}</span></a></li>`,
              )
              .join("")
          : `<li class="px-4 py-3 text-sm text-muted-foreground">표시할 게시글이 없습니다.</li>`;
      mount.className = "surface-card overflow-hidden my-4";
      mount.innerHTML = `<div class="border-b border-border/60 bg-muted/30 px-4 py-3 text-sm font-semibold">${title}</div><ul class="m-0 list-none p-0">${list}</ul>`;
    });
  });
}

/** 저장된 HTML 내 플레이스홀더를 라이브 위젯으로 교체 */
export function LayoutContentHydrator({ html, className }: LayoutContentHydratorProps) {
  const commerceIds = useMemo(
    () =>
      parseCommerceModulesFromHtml(html).map((m) => m.id as CommerceModuleId),
    [html],
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const hasCommerce = commerceIds.length > 0;
  const hasDataWidgets = /data-intranet-widget=/i.test(html);
  const hasCommerceNodes = /data-commerce-module=/i.test(html);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    root.innerHTML = html;

    if (hasCommerceNodes) {
      root.querySelectorAll("[data-commerce-module]").forEach((node) => {
        (node as HTMLElement).style.display = "none";
      });
    }

    if (hasDataWidgets) {
      hydrateDataWidgets(root);
    }
  }, [html, hasCommerceNodes, hasDataWidgets]);

  if (!hasCommerce && !hasDataWidgets && !hasCommerceNodes) {
    return (
      <div
        className={className ?? "page-layout-content"}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  return (
    <div className={className}>
      <div ref={containerRef} className="page-layout-content" />
      {hasCommerce && <CommerceModuleStrip moduleIds={commerceIds} />}
    </div>
  );
}
