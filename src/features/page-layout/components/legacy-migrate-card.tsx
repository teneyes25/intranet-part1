"use client";

import { useTransition } from "react";
import { ArrowRightLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { migrateLegacyGridsAction } from "@/features/page-layout/actions";

export function LegacyGridMigrateCard() {
  const [pending, startTransition] = useTransition();

  function migrate() {
    if (!confirm("레거시 그리드 빌더 내용을 GrapesJS 레이아웃으로 이전할까요?")) return;

    startTransition(async () => {
      const r = await migrateLegacyGridsAction();
      if (r.error) toast.error(r.error);
      else toast.success(`GrapesJS로 ${r.count ?? 0}개 페이지를 마이그레이션했습니다.`);
    });
  }

  return (
    <Card className="border-amber-200/60 bg-amber-50/30 dark:border-amber-900/40 dark:bg-amber-950/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ArrowRightLeft className="h-4 w-4 text-amber-700" />
          레거시 그리드 → GrapesJS
        </CardTitle>
        <CardDescription>
          Phase 2 정책: GrapesJS 레이아웃이 저장되어 있으면 항상 GrapesJS가 우선 렌더링됩니다.
          아래 레거시 그리드는 읽기 전용이며, 한 번 클릭으로 GrapesJS로 이전할 수 있습니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button type="button" variant="outline" onClick={migrate} disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRightLeft className="h-4 w-4" />}
          레거시 그리드 마이그레이션
        </Button>
      </CardContent>
    </Card>
  );
}
