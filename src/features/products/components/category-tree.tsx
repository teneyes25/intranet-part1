"use client";

import Link from "next/link";
import { ChevronRight, Folder } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CategoryNode {
  id: string;
  name: string;
  slug: string;
  children: CategoryNode[];
}

interface Props {
  tree: CategoryNode[];
  activeSlug?: string;
  boardKey: string;
}

function Node({
  node,
  activeSlug,
  boardKey,
  depth = 0,
}: {
  node: CategoryNode;
  activeSlug?: string;
  boardKey: string;
  depth?: number;
}) {
  const active = activeSlug === node.slug;
  return (
    <li>
      <Link
        href={`/boards/${boardKey}?cat=${node.slug}`}
        className={cn(
          "flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted",
          active && "bg-primary/10 font-medium text-primary",
        )}
        style={{ paddingLeft: `${8 + depth * 12}px` }}
      >
        <Folder className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="truncate">{node.name}</span>
        {active && <ChevronRight className="ml-auto h-3.5 w-3.5" />}
      </Link>
      {node.children.length > 0 && (
        <ul className="mt-0.5">
          {node.children.map((c) => (
            <Node
              key={c.id}
              node={c}
              activeSlug={activeSlug}
              boardKey={boardKey}
              depth={depth + 1}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export function CategoryTree({ tree, activeSlug, boardKey }: Props) {
  return (
    <nav className="rounded-lg border bg-card p-2">
      <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        카테고리
      </p>
      <ul className="space-y-0.5">
        <li>
          <Link
            href={`/boards/${boardKey}`}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm hover:bg-muted",
              !activeSlug && "bg-muted font-medium",
            )}
          >
            전체 자료
          </Link>
        </li>
        {tree.map((n) => (
          <Node key={n.id} node={n} activeSlug={activeSlug} boardKey={boardKey} />
        ))}
      </ul>
    </nav>
  );
}
