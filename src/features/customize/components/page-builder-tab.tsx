"use client";

import Link from "next/link";
import { ExternalLink, LayoutTemplate } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LegacyGridMigrateCard } from "@/features/page-layout/components/legacy-migrate-card";

export function PageBuilderTab() {
  return (
    <div className="space-y-6">
      <Card className="border-brand-light/40 bg-gradient-to-br from-brand-light/10 to-background">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <LayoutTemplate className="h-4 w-4 text-brand" />
            GrapesJS Visual Page Builder
          </CardTitle>
          <CardDescription>
            Wix / 네이버블로그 수준 WYSIWYG 편집기. 대시보드·배너·게시판·게시글별 상세 레이아웃,
            템플릿·테마·3버전 백업·대리점 Self-Service를 지원합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/admin/customize/page-builder">
              <ExternalLink className="h-4 w-4" />
              Visual Editor 열기
            </Link>
          </Button>
        </CardContent>
      </Card>

      <LegacyGridMigrateCard />

      <div className="rounded-lg border border-border/60 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
        <strong>렌더링:</strong> GrapesJS 레이아웃 → (대리점 오버라이드 → 본사 global) → 기본 UI.
        레거시 그리드 JSON은 아래 마이그레이션으로 이전하세요. 자세한 내용은{" "}
        <code className="text-xs">docs/PAGE_BUILDER.md</code> 참고.
      </div>
    </div>
  );
}
