"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { Search } from "lucide-react";
import { getNavModuleVisible } from "@/config/nav-modules";
import { openCommandPalette } from "@/components/layout/command-palette";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function TopbarSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [modKey, setModKey] = useState("Ctrl");
  const searchVisible = getNavModuleVisible("search");

  useEffect(() => {
    if (/Mac|iPhone|iPad/.test(navigator.platform)) setModKey("⌘");
  }, []);

  if (!searchVisible) return null;

  function go(query: string) {
    const trimmed = query.trim();
    if (!trimmed) return;
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    setMobileOpen(false);
    setQ("");
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    go(q);
  }

  const form = (
    <form onSubmit={onSubmit} className="flex gap-2">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => openCommandPalette()}
          placeholder="통합 검색..."
          aria-label="통합 검색"
          className="h-10 rounded-xl border-border/70 bg-muted/30 pl-9 pr-16 shadow-xs focus-visible:bg-card"
        />
        <button
          type="button"
          onClick={() => openCommandPalette()}
          className="absolute right-2 top-1/2 hidden -translate-y-1/2 items-center gap-0.5 rounded-md border border-border/60 bg-background/80 px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-muted sm:flex"
          aria-label="빠른 검색 열기 (Cmd+K)"
        >
          <span>{modKey}</span>K
        </button>
      </div>
      <Button type="submit" size="sm" variant="accent" className="rounded-xl px-4">
        검색
      </Button>
    </form>
  );

  return (
    <>
      <div className="relative hidden w-full max-w-md sm:block">{form}</div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="sm:hidden"
            aria-label="검색"
          >
            <Search className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="top" className="pt-10">
          <SheetHeader>
            <SheetTitle>통합 검색</SheetTitle>
          </SheetHeader>
          <div className="mt-4">{form}</div>
        </SheetContent>
      </Sheet>
    </>
  );
}
