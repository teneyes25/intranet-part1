"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

export function BoardPagination({
  page,
  totalPages,
}: {
  page: number;
  totalPages: number;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (totalPages <= 1) return null;

  function hrefFor(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    return `${pathname}?${params.toString()}`;
  }

  const windowSize = 5;
  const start = Math.max(1, Math.min(page - 2, totalPages - windowSize + 1));
  const end = Math.min(totalPages, start + windowSize - 1);
  const pages = [];
  for (let i = start; i <= end; i++) pages.push(i);

  const itemCls = (active: boolean) =>
    cn(
      "inline-flex h-9 min-w-9 items-center justify-center rounded-md border px-3 text-sm transition-colors hover:bg-accent",
      active && "border-primary bg-primary text-primary-foreground hover:bg-primary",
    );

  return (
    <nav className="flex items-center justify-center gap-1">
      {page > 1 && (
        <Link href={hrefFor(page - 1)} className={itemCls(false)} aria-label="이전">
          <ChevronLeft className="h-4 w-4" />
        </Link>
      )}
      {pages.map((p) => (
        <Link key={p} href={hrefFor(p)} className={itemCls(p === page)}>
          {p}
        </Link>
      ))}
      {page < totalPages && (
        <Link href={hrefFor(page + 1)} className={itemCls(false)} aria-label="다음">
          <ChevronRight className="h-4 w-4" />
        </Link>
      )}
    </nav>
  );
}
