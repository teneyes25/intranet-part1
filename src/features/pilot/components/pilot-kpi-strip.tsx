import Link from "next/link";
import { ArrowRight, Target } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { PilotKpiSummary } from "@/features/pilot/kpi-queries";
import { cn } from "@/lib/utils";

const STATUS_STYLES = {
  ok: "border-emerald-500/30 bg-emerald-500/[0.06] text-emerald-700 dark:text-emerald-400",
  warn: "border-amber-500/30 bg-amber-500/[0.06] text-amber-700 dark:text-amber-400",
  bad: "border-destructive/30 bg-destructive/[0.06] text-destructive",
  na: "border-border/60 bg-muted/30 text-muted-foreground",
} as const;

interface PilotKpiStripProps {
  data: PilotKpiSummary;
  compact?: boolean;
  showLink?: boolean;
}

export function PilotKpiStrip({ data, compact = false, showLink = true }: PilotKpiStripProps) {
  return (
    <Card className="overflow-hidden border-primary/15 shadow-card">
      <CardHeader className="border-b border-border/50 bg-primary/[0.03] pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-4 w-4 text-primary" />
              Pilot KPI ({data.periodDays}일)
            </CardTitle>
            <CardDescription className="mt-1">
              PRD v1.2.1 목표 대비 실측 · 대리점 {data.totalDealers}곳 · 활성 로그인{" "}
              {data.activeDealerCount}곳
              {!data.pilotActive && " · Pilot 배너 비활성"}
            </CardDescription>
          </div>
          {showLink && (
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/pilot">
                상세 모니터링
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className={cn("pt-4", compact && "pt-3")}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {data.kpis.map((kpi) => (
            <div
              key={kpi.id}
              className={cn(
                "rounded-xl border px-3 py-3 transition-colors",
                STATUS_STYLES[kpi.status],
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold">{kpi.label}</p>
                <Badge variant="outline" className="shrink-0 text-[10px]">
                  {kpi.targetLabel}
                </Badge>
              </div>
              <p className="mt-1 text-2xl font-bold tracking-tight">{kpi.displayValue}</p>
              {!compact && (
                <p className="mt-1 text-xs opacity-80">{kpi.description}</p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
