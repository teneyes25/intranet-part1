import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "활동 로그",
};

export default async function AdminActivityPage() {
  const user = await requireUser();
  if (user.role !== "ADMIN") {
    return (
      <div className="rounded-lg border p-8 text-center text-muted-foreground">
        관리자만 접근할 수 있습니다.
      </div>
    );
  }

  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <PageHeader
        title="활동 로그"
        description="로그인, 결재, AI 호출 등 감사 기록 (최근 100건)"
      />
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50 text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3">시각</th>
              <th className="px-4 py-3">액션</th>
              <th className="px-4 py-3">사용자</th>
              <th className="px-4 py-3">IP</th>
              <th className="px-4 py-3">상세</th>
              <th className="px-4 py-3">결과</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-muted/30">
                <td className="whitespace-nowrap px-4 py-2 text-xs">
                  {new Intl.DateTimeFormat("ko-KR", {
                    dateStyle: "short",
                    timeStyle: "medium",
                  }).format(log.createdAt)}
                </td>
                <td className="px-4 py-2">
                  <Badge variant="secondary">{log.action}</Badge>
                </td>
                <td className="px-4 py-2">{log.userEmail ?? "—"}</td>
                <td className="px-4 py-2 font-mono text-xs">{log.ip ?? "—"}</td>
                <td className="max-w-xs truncate px-4 py-2 text-muted-foreground">
                  {log.detail ?? log.resource ?? "—"}
                </td>
                <td className="px-4 py-2">
                  <Badge variant={log.success ? "default" : "destructive"}>
                    {log.success ? "OK" : "FAIL"}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
