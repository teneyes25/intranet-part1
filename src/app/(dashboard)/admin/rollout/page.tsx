import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { RolloutDashboardClient } from "@/features/rollout/components/rollout-dashboard";
import { getRolloutDashboard } from "@/features/rollout/rollout-service";
import { requireRole } from "@/lib/auth/session";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Rollout 대시보드",
};

export default async function AdminRolloutPage() {
  await requireRole(["ADMIN"]);
  const data = await getRolloutDashboard();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rollout 대시보드"
        description="100개 대리점 · Group 1~5 (20곳씩) 단계별 활성화"
      />
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="py-4 text-sm">
          <p className="font-medium">Rollout 일정 (권장)</p>
          <ul className="mt-2 grid gap-1 text-muted-foreground sm:grid-cols-5">
            <li>1주: group-1 (1~20)</li>
            <li>2주: group-2 (21~40)</li>
            <li>3주: group-3 (41~60)</li>
            <li>4주: group-4 (61~80)</li>
            <li>5주: group-5 (81~100)</li>
          </ul>
        </CardContent>
      </Card>
      <RolloutDashboardClient stats={data.stats} groups={data.groups} />
      {data.feedbacks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">최근 Rollout 피드백</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {data.feedbacks.map((f: (typeof data.feedbacks)[number]) => (
                <li key={f.id} className="rounded border p-2">
                  <p className="font-medium">
                    {f.dealer?.name ?? "본사"} · {f.user.name} · ★{f.rating}
                  </p>
                  <p className="text-muted-foreground">{f.message}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
