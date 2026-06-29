import type { LucideIcon } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  href?: string;
  trend?: "up" | "down" | "neutral";
}

export function StatCard({ title, value, hint, icon: Icon, href, trend = "neutral" }: StatCardProps) {
  const inner = (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border border-border/70 bg-card p-5 shadow-card transition-all duration-200",
        href && "cursor-pointer hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-elevated",
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.04] via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {title}
          </p>
          <p className="text-3xl font-bold tracking-tight text-foreground">{value}</p>
          {hint && (
            <p
              className={cn(
                "text-xs",
                trend === "up" && "text-emerald-600",
                trend === "down" && "text-destructive",
                trend === "neutral" && "text-muted-foreground",
              )}
            >
              {hint}
            </p>
          )}
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/10">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {inner}
      </Link>
    );
  }

  return inner;
}
