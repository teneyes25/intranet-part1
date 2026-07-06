import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageBreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

/** Pilot 표준 Breadcrumb — PageHero/PageHeader 상단 또는 하단에 배치 */
export function PageBreadcrumb({ items, className }: PageBreadcrumbProps) {
  if (items.length === 0) return null;

  return (
    <nav
      aria-label="breadcrumb"
      className={cn("mb-3 flex flex-wrap items-center gap-1 text-sm text-muted-foreground", className)}
    >
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 rounded-md px-1 py-0.5 transition-colors hover:text-foreground"
      >
        <Home className="h-3.5 w-3.5" aria-hidden />
        <span className="sr-only sm:not-sr-only">홈</span>
      </Link>
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={`${item.label}-${i}`} className="inline-flex items-center gap-1">
            <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50" aria-hidden />
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="max-w-[12rem] truncate rounded-md px-1 py-0.5 transition-colors hover:text-foreground sm:max-w-xs"
              >
                {item.label}
              </Link>
            ) : (
              <span
                className={cn(
                  "max-w-[14rem] truncate px-1 sm:max-w-md",
                  isLast && "font-medium text-foreground",
                )}
                aria-current={isLast ? "page" : undefined}
              >
                {item.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
