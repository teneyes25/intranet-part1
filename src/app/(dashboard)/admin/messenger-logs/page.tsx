import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { requireRole } from "@/lib/auth/session";
import { listAdminLogs } from "@/features/messenger/service";

export const metadata: Metadata = { title: "메신저 로그" };

export default async function AdminMessengerLogsPage() {
  await requireRole(["ADMIN"]);
  const logs = await listAdminLogs(300);

  return (
    <div>
      <PageHeader
        title="사내 메신저 로그"
        description="대화 전송·파일·프로필 변경·보관 삭제 기록입니다. 시스템 관리자만 볼 수 있습니다."
      />
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50 text-left text-muted-foreground">
            <tr>
              <th className="px-3 py-2">시각</th>
              <th className="px-3 py-2">액션</th>
              <th className="px-3 py-2">사용자</th>
              <th className="px-3 py-2">상세</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">
                  기록이 없습니다.
                </td>
              </tr>
            )}
            {logs.map((l) => (
              <tr key={l.id} className="border-t">
                <td className="whitespace-nowrap px-3 py-2 text-xs">
                  {l.createdAt.toLocaleString("ko-KR")}
                </td>
                <td className="px-3 py-2">{l.action}</td>
                <td className="px-3 py-2">
                  {l.actor?.name ?? "-"}
                  {l.actor?.email ? (
                    <span className="block text-[11px] text-muted-foreground">
                      {l.actor.email}
                    </span>
                  ) : null}
                </td>
                <td className="max-w-md truncate px-3 py-2 text-xs">{l.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
