"use client";

import { useTransition } from "react";
import { Loader2, Rocket } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  activateRolloutGroupAction,
  deactivateRolloutGroupAction,
} from "@/features/dealers/actions";

type Group = {
  id: string;
  key: string;
  name: string;
  isActive: boolean;
  dealers: {
    id: string;
    code: string;
    name: string;
    rolloutActive: boolean;
    isActive: boolean;
    _count: { users: number };
  }[];
};

export function RolloutDashboardClient({
  stats,
  groups,
}: {
  stats: {
    totalDealers: number;
    rolloutActiveDealers: number;
    progressPct: number;
    dealerUsers: number;
    rolloutUsers: number;
    logins7d: number;
  };
  groups: Group[];
}) {
  const [pending, start] = useTransition();

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="전체 대리점" value={String(stats.totalDealers)} />
        <Stat label="Rollout 활성" value={`${stats.rolloutActiveDealers} (${stats.progressPct}%)`} />
        <Stat label="Rollout 사용자" value={`${stats.rolloutUsers}/${stats.dealerUsers}`} />
        <Stat label="7일 로그인" value={String(stats.logins7d)} />
      </div>

      <div className="space-y-4">
        {groups.map((g) => {
          const active = g.dealers.filter((d) => d.rolloutActive).length;
          return (
            <Card key={g.id}>
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Rocket className="h-4 w-4" />
                    {g.name}
                    <Badge variant="outline">{g.key}</Badge>
                  </CardTitle>
                  <CardDescription>
                    {active}/{g.dealers.length} 대리점 Rollout ON
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={pending}
                    onClick={() => start(() => activateRolloutGroupAction(g.id))}
                  >
                    {pending && <Loader2 className="h-3 w-3 animate-spin" />}
                    그룹 ON
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() => start(() => deactivateRolloutGroupAction(g.id))}
                  >
                    OFF
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="grid gap-1 text-sm sm:grid-cols-2 lg:grid-cols-3">
                  {g.dealers.map((d) => (
                    <li key={d.id} className="flex items-center justify-between rounded border px-2 py-1">
                      <span>{d.name}</span>
                      <Badge variant={d.rolloutActive ? "default" : "secondary"}>
                        {d.rolloutActive ? "ON" : "OFF"}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}
