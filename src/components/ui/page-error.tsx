"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface PageErrorProps {
  title?: string;
  message?: string;
  reset?: () => void;
}

export function PageError({
  title = "문제가 발생했습니다",
  message = "페이지를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
  reset,
}: PageErrorProps) {
  return (
    <Card className="mx-auto max-w-lg border-destructive/20 shadow-elevated">
      <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <AlertTriangle className="h-7 w-7" aria-hidden />
        </span>
        <div className="space-y-1.5">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
        {reset && (
          <Button onClick={reset} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            다시 시도
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
