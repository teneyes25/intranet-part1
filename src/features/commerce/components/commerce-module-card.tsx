"use client";

import Link from "next/link";
import {
  ArrowRight,
  CreditCard,
  FileSignature,
  FileText,
  Package,
  Receipt,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  COMMERCE_MODULES,
  buildCommerceStubResponse,
} from "@/features/commerce/module-registry";
import type { CommerceModuleId } from "@/features/commerce/types";

const MODULE_ICONS: Record<CommerceModuleId, typeof Package> = {
  order: Package,
  "tax-invoice": Receipt,
  payment: CreditCard,
  contract: FileSignature,
};

export function CommerceModuleCard({ moduleId }: { moduleId: CommerceModuleId }) {
  const meta = COMMERCE_MODULES[moduleId];
  const stub = buildCommerceStubResponse(moduleId);
  const Icon = MODULE_ICONS[moduleId];

  return (
    <div className="surface-card overflow-hidden">
      <div className="flex items-start gap-4 border-b border-border/60 bg-muted/30 p-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-foreground">{meta.label}</h3>
            <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
              Part 2 Preview
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{stub.message}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 p-4">
        <p className="font-mono text-xs text-muted-foreground">{meta.apiPath}</p>
        <Button asChild size="sm" variant="outline">
          <Link href={meta.href}>
            모듈 열기
            <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

export function CommerceModuleStrip({ moduleIds }: { moduleIds: CommerceModuleId[] }) {
  if (moduleIds.length === 0) return null;

  return (
    <div className="not-prose my-6 space-y-3">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        <FileText className="h-3.5 w-3.5" />
        B2B 거래 모듈
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {moduleIds.map((id) => (
          <CommerceModuleCard key={id} moduleId={id} />
        ))}
      </div>
    </div>
  );
}
