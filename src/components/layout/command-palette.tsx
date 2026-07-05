"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  FileText,
  FolderOpen,
  User,
  LayoutGrid,
  Loader2,
  ArrowRight,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { getVisibleNavGroups } from "@/config/navigation";
import type { Role } from "@/lib/auth/roles";

export const COMMAND_PALETTE_EVENT = "intranet:command-palette";

interface ApiItem {
  id: string;
  title: string;
  type: "post" | "document" | "user";
  href: string;
  snippet: string;
}

interface PaletteItem {
  id: string;
  title: string;
  group: "menu" | "post" | "document" | "user";
  href: string;
  snippet?: string;
}

const GROUP_LABEL: Record<PaletteItem["group"], string> = {
  menu: "메뉴",
  post: "게시물",
  document: "문서",
  user: "사용자",
};

const GROUP_ICON = {
  menu: LayoutGrid,
  post: FileText,
  document: FolderOpen,
  user: User,
} as const;

function isMac() {
  if (typeof navigator === "undefined") return false;
  return /Mac|iPhone|iPad/.test(navigator.platform);
}

export function CommandPalette({ role }: { role: Role }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [apiItems, setApiItems] = useState<ApiItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const navItems = useMemo(() => {
    return getVisibleNavGroups(role).flatMap((g) =>
      g.items.map((item) => ({
        id: `nav:${item.href}`,
        title: item.title,
        group: "menu" as const,
        href: item.href,
        snippet: g.label,
      })),
    );
  }, [role]);

  const menuMatches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return navItems.slice(0, 8);
    return navItems.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        (item.snippet?.toLowerCase().includes(q) ?? false),
    );
  }, [navItems, query]);

  const flatItems: PaletteItem[] = useMemo(() => {
    const remote: PaletteItem[] = apiItems.map((item) => ({
      id: `${item.type}:${item.id}`,
      title: item.title,
      group: item.type,
      href: item.href,
      snippet: item.snippet,
    }));
    const seen = new Set<string>();
    const merged: PaletteItem[] = [];
    for (const item of [...menuMatches, ...remote]) {
      const key = `${item.group}:${item.href}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(item);
    }
    return merged;
  }, [menuMatches, apiItems]);

  const grouped = useMemo(() => {
    const order: PaletteItem["group"][] = ["menu", "post", "document", "user"];
    return order
      .map((g) => ({
        group: g,
        items: flatItems.filter((i) => i.group === g),
      }))
      .filter((g) => g.items.length > 0);
  }, [flatItems]);

  const openPalette = useCallback(() => {
    setOpen(true);
    setQuery("");
    setApiItems([]);
    setSelected(0);
  }, []);

  const closePalette = useCallback(() => {
    setOpen(false);
    setQuery("");
    setApiItems([]);
    setSelected(0);
  }, []);

  const navigate = useCallback(
    (href: string) => {
      closePalette();
      router.push(href);
    },
    [closePalette, router],
  );

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        openPalette();
      }
    }
    function onCustomOpen() {
      openPalette();
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener(COMMAND_PALETTE_EVENT, onCustomOpen);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(COMMAND_PALETTE_EVENT, onCustomOpen);
    };
  }, [openPalette]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 0);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    setSelected(0);
  }, [query, apiItems.length]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (q.length < 2) {
      setApiItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/quick?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        if (res.ok && Array.isArray(data.items)) {
          setApiItems(data.items);
        } else {
          setApiItems([]);
        }
      } catch {
        setApiItems([]);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  function onInputKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((i) => Math.min(i + 1, flatItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = flatItems[selected];
      if (item) navigate(item.href);
    } else if (e.key === "Escape") {
      e.preventDefault();
      closePalette();
    }
  }

  let runningIndex = -1;

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? openPalette() : closePalette())}>
      <DialogContent
        className="max-w-xl overflow-hidden p-0 sm:top-[18%] sm:translate-y-0"
        hideClose
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>빠른 검색</DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onInputKeyDown}
            placeholder="메뉴·게시물·문서·사용자 검색..."
            className="h-9 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
            aria-label="빠른 검색"
            autoComplete="off"
          />
          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          <kbd className="hidden rounded-md border border-border/70 bg-muted/40 px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline">
            ESC
          </kbd>
        </div>

        <div className="max-h-[min(24rem,50vh)] overflow-y-auto px-2 pb-3 pt-1">
          {flatItems.length === 0 && !loading && (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              {query.trim().length < 2
                ? "메뉴를 탐색하거나 2자 이상 입력하세요."
                : "검색 결과가 없습니다."}
            </p>
          )}

          {grouped.map(({ group, items }) => {
            const Icon = GROUP_ICON[group];
            return (
              <div key={group} className="mb-2">
                <p className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {GROUP_LABEL[group]}
                </p>
                <ul>
                  {items.map((item) => {
                    runningIndex += 1;
                    const idx = runningIndex;
                    const active = idx === selected;
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          className={cn(
                            "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                            active
                              ? "bg-primary/10 text-foreground"
                              : "hover:bg-muted/60",
                          )}
                          onMouseEnter={() => setSelected(idx)}
                          onClick={() => navigate(item.href)}
                        >
                          <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium">{item.title}</p>
                            {item.snippet && (
                              <p className="truncate text-xs text-muted-foreground">
                                {item.snippet}
                              </p>
                            )}
                          </div>
                          {active && (
                            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between border-t border-border/60 bg-muted/20 px-4 py-2 text-[11px] text-muted-foreground">
          <span>
            <kbd className="rounded border border-border/60 bg-background px-1">
              {isMac() ? "⌘" : "Ctrl"}K
            </kbd>{" "}
            로 열기
          </span>
          <span>↑↓ 이동 · Enter 선택 · Esc 닫기</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function openCommandPalette() {
  window.dispatchEvent(new Event(COMMAND_PALETTE_EVENT));
}
