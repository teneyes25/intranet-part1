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
import { bulkImportUsersAction } from "@/features/users/bulk-import/actions";
import { BULK_IMPORT_CSV_TEMPLATE } from "@/features/users/bulk-import/template";

export function BulkUserImportPanel() {
  const [csv, setCsv] = useState(BULK_IMPORT_CSV_TEMPLATE);
  const [result, setResult] = useState<Awaited<ReturnType<typeof bulkImportUsersAction>> | null>(
    null,
  );
  const [pending, startTransition] = useTransition();

  function downloadTemplate() {
    const blob = new Blob([BULK_IMPORT_CSV_TEMPLATE], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "user-import-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImport() {
    startTransition(async () => {
      const res = await bulkImportUsersAction(csv);
      setResult(res);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">사용자 대량 등록 (CSV / Excel)</CardTitle>
        <CardDescription>
          Excel에서 CSV UTF-8로 저장 후 붙여넣기. 신규 계정은 최초 로그인 시 비밀번호 변경이
          필요합니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={downloadTemplate}>
            <Download className="h-4 w-4" />
            템플릿 다운로드
          </Button>
        </div>
        <Textarea
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          rows={8}
          className="font-mono text-xs"
        />
        <Button type="button" onClick={handleImport} disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          가져오기 실행
        </Button>
        {result?.error && <p className="text-sm text-destructive">{result.error}</p>}
        {result?.created !== undefined && (
          <p className="text-sm text-emerald-600">
            생성 {result.created}명 · 건너뜀 {result.skipped ?? 0}명
          </p>
        )}
        {result?.errors && result.errors.length > 0 && (
          <ul className="list-inside list-disc text-xs text-destructive">
            {result.errors.slice(0, 10).map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
