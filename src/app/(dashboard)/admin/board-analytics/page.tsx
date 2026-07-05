import type { Metadata } from "next";

import { PageHero } from "@/components/layout/page-hero";
import { Badge } from "@/components/ui/badge";
import { requireRole } from "@/lib/auth/session";
import {
  getBoardStatistics,
  getDealerBoardActivity,
} from "@/features/admin/board-analytics-queries";
import { formatDateTime } from "@/features/board/utils";

export const metadata: Metadata = { title: "게시판 통계" };

export default async function BoardAnalyticsPage() {
  await requireRole(["ADMIN", "HEADQUARTER"]);
  const [boardStats, dealerActivity] = await Promise.all([
    getBoardStatistics(),
    getDealerBoardActivity(15),
  ]);

  return (
    <div className="page-shell space-y-8">
      <PageHero
        variant="plain"
        eyebrow="관리자"
        title="게시판 통계"
        description="게시판별 조회·게시물·인기 키워드와 대리점 활동 모니터링"
      />

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">게시판별 현황</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {boardStats.map((b) => (
            <div key={b.boardKey} className="rounded-xl border bg-card p-4 shadow-xs">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{b.boardName}</p>
                  <p className="text-xs text-muted-foreground">{b.boardKey}</p>
                </div>
                <Badge variant="secondary">{b.postCount}건</Badge>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-muted-foreground">총 조회</dt>
                  <dd className="font-medium">{b.totalViews.toLocaleString()}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">평균 조회</dt>
                  <dd className="font-medium">{b.avgViews.toLocaleString()}</dd>
                </div>
              </dl>
              {b.topKeywords.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {b.topKeywords.map((k) => (
                    <Badge key={k.word} variant="outline" className="text-[10px]">
                      {k.word} ({k.count})
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">대리점별 게시판 활동</h2>
        <div className="overflow-hidden rounded-xl border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-3">대리점</th>
                <th className="px-4 py-3">코드</th>
                <th className="px-4 py-3 text-right">게시글</th>
                <th className="px-4 py-3 text-right">댓글</th>
                <th className="px-4 py-3">최근 활동</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {dealerActivity.map((d) => (
                <tr key={d.dealerId} className="hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium">{d.dealerName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{d.dealerCode}</td>
                  <td className="px-4 py-3 text-right">{d.postCount}</td>
                  <td className="px-4 py-3 text-right">{d.commentCount}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {d.lastActivityAt ? formatDateTime(d.lastActivityAt) : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
