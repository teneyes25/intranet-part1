"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { LayoutGrid, List, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export type BoardLayoutMode = "list" | "card";

interface BoardViewToolbarProps {
  total: number;
  layout: BoardLayoutMode;
  infinite?: boolean;
  loadingMore?: boolean;
}

export function BoardViewToolbar({
  total,
  layout,
  infinite,
  loadingMore,
}: BoardViewToolbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setLayout(mode: BoardLayoutMode) {
    const params = new URLSearchParams(searchParams.toString());
    if (mode === "list") params.delete("layout");
    else params.set("layout", mode);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-sm text-muted-foreground">
        총 <strong className="text-foreground">{total}</strong>건
        {infinite && loadingMore && (
          <span className="ml-2 inline-flex items-center gap-1 text-xs">
            <Loader2 className="h-3 w-3 animate-spin" />
            불러오는 중…
          </span>
        )}
      </p>
      <div className="flex items-center gap-1 rounded-xl border border-border/60 bg-muted/30 p-1 shadow-xs">
        <Button
          type="button"
          size="sm"
          variant={layout === "list" ? "accent" : "ghost"}
          className="h-8 min-h-8 gap-1.5 px-2.5 touch-target-sm"
          onClick={() => setLayout("list")}
          aria-pressed={layout === "list"}
        >
          <List className="h-4 w-4" />
          <span className="hidden sm:inline">리스트</span>
        </Button>
        <Button
          type="button"
          size="sm"
          variant={layout === "card" ? "accent" : "ghost"}
          className="h-8 min-h-8 gap-1.5 px-2.5 touch-target-sm"
          onClick={() => setLayout("card")}
          aria-pressed={layout === "card"}
        >
          <LayoutGrid className="h-4 w-4" />
          <span className="hidden sm:inline">카드</span>
        </Button>
        {infinite && (
          <Badge variant="outline" className="ml-1 hidden h-7 text-[10px] sm:inline-flex">
            무한 스크롤
          </Badge>
        )}
      </div>
    </div>
  );
}
