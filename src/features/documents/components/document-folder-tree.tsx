"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
} from "lucide-react";

import { cn } from "@/lib/utils";

export interface FolderTreeItem {
  id: string;
  name: string;
  slug: string;
  children: FolderTreeItem[];
  _count?: { children: number; documents: number };
}

export function DocumentFolderTree({
  tree,
  defaultExpandedSlugs = [],
}: {
  tree: FolderTreeItem[];
  defaultExpandedSlugs?: string[];
}) {
  const pathname = usePathname();
  const activeSlug = useMemo(() => {
    const m = pathname?.match(/^\/documents\/([^/]+)/);
    return m?.[1] ?? null;
  }, [pathname]);

  const initial = useMemo(() => new Set(defaultExpandedSlugs), [defaultExpandedSlugs]);
  const [expanded, setExpanded] = useState<Set<string>>(initial);

  function toggle(slug: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  return (
    <nav className="space-y-0.5 text-sm" aria-label="문서함 폴더 트리">
      {tree.map((node) => (
        <TreeNode
          key={node.id}
          node={node}
          depth={0}
          expanded={expanded}
          activeSlug={activeSlug}
          onToggle={toggle}
        />
      ))}
    </nav>
  );
}

function TreeNode({
  node,
  depth,
  expanded,
  activeSlug,
  onToggle,
}: {
  node: FolderTreeItem;
  depth: number;
  expanded: Set<string>;
  activeSlug: string | null;
  onToggle: (slug: string) => void;
}) {
  const hasChildren = node.children.length > 0;
  const isOpen = expanded.has(node.slug) || depth === 0;
  const isActive = activeSlug === node.slug;
  const href = `/documents/${node.slug}`;

  return (
    <div>
      <div
        className={cn(
          "group flex items-center gap-1 rounded-md pr-2",
          isActive && "bg-primary/10 text-primary",
        )}
        style={{ paddingLeft: `${depth * 14 + 4}px` }}
      >
        <button
          type="button"
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted"
          aria-label={isOpen ? "폴더 접기" : "폴더 펼치기"}
          onClick={() => onToggle(node.slug)}
          disabled={!hasChildren && depth > 0}
        >
          {hasChildren ? (
            isOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )
          ) : (
            <span className="h-4 w-4" />
          )}
        </button>
        <Link
          href={href}
          className={cn(
            "flex min-w-0 flex-1 items-center gap-2 rounded-md px-1.5 py-1.5 hover:bg-muted/70",
            isActive && "font-semibold",
          )}
        >
          {isOpen || isActive ? (
            <FolderOpen className="h-4 w-4 shrink-0 text-amber-600" />
          ) : (
            <Folder className="h-4 w-4 shrink-0 text-amber-600/80" />
          )}
          <span className="truncate">{node.name}</span>
          {typeof node._count?.documents === "number" && node._count.documents > 0 && (
            <span className="ml-auto text-[10px] text-muted-foreground">
              {node._count.documents}
            </span>
          )}
        </Link>
      </div>
      {hasChildren && isOpen && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              activeSlug={activeSlug}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}
