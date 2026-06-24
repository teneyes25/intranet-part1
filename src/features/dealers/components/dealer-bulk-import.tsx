"use client";

import { useState, useTransition } from "react";
import { Download, Loader2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  bulkImportDealersAction,
  DEALER_IMPORT_TEMPLATE,
} from "@/features/dealers/actions";

export function DealerBulkImportPanel() {
  const [csv, setCsv] = useState(DEALER_IMPORT_TEMPLATE);
  const [result, setResult] = useState<Awaited<
    ReturnType<typeof bulkImportDealersAction>
  > | null>(null);
  const [pending, start] = useTransition();

  function downloadTemplate() {
    const blob = new Blob([DEALER_IMPORT_TEMPLATE], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "dealer-import-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">대리점 Bulk Import (100+)</CardTitle>
        <CardDescription>
          code,name,region,rolloutGroupKey,rolloutActive — Excel CSV UTF-8
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button type="button" variant="outline" size="sm" onClick={downloadTemplate}>
          <Download className="h-4 w-4" />
          템플릿
        </Button>
        <Textarea value={csv} onChange={(e) => setCsv(e.target.value)} rows={6} className="font-mono text-xs" />
        <Button
          disabled={pending}
          onClick={() => start(async () => setResult(await bulkImportDealersAction(csv)))}
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          가져오기
        </Button>
        {result?.error && <p className="text-sm text-destructive">{result.error}</p>}
        {result?.created !== undefined && (
          <p className="text-sm text-emerald-600">
            생성 {result.created} · 갱신 {result.updated ?? 0}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
