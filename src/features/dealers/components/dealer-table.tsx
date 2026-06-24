"use client";

import { useTransition } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  toggleDealerActiveAction,
  toggleDealerRolloutAction,
} from "@/features/dealers/actions";

type DealerRow = {
  id: string;
  code: string;
  name: string;
  region: string | null;
  isActive: boolean;
  rolloutActive: boolean;
  rolloutGroup: { name: string } | null;
  _count: { users: number };
};

export function DealerTable({ dealers }: { dealers: DealerRow[] }) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/30 text-left text-muted-foreground">
          <tr>
            <th className="px-4 py-3">코드</th>
            <th className="px-4 py-3">이름</th>
            <th className="px-4 py-3">지역</th>
            <th className="px-4 py-3">그룹</th>
            <th className="px-4 py-3">사용자</th>
            <th className="px-4 py-3">상태</th>
            <th className="px-4 py-3">Rollout</th>
            <th className="px-4 py-3">제어</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {dealers.map((d) => (
            <tr key={d.id} className="hover:bg-muted/20">
              <td className="px-4 py-3 font-mono text-xs">{d.code}</td>
              <td className="px-4 py-3 font-medium">{d.name}</td>
              <td className="px-4 py-3 text-muted-foreground">{d.region ?? "-"}</td>
              <td className="px-4 py-3">{d.rolloutGroup?.name ?? "-"}</td>
              <td className="px-4 py-3">{d._count.users}</td>
              <td className="px-4 py-3">
                <Badge variant={d.isActive ? "default" : "secondary"}>
                  {d.isActive ? "활성" : "비활성"}
                </Badge>
              </td>
              <td className="px-4 py-3">
                <Badge variant={d.rolloutActive ? "default" : "outline"}>
                  {d.rolloutActive ? "ON" : "OFF"}
                </Badge>
              </td>
              <td className="px-4 py-3">
                <DealerControls dealer={d} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DealerControls({ dealer }: { dealer: DealerRow }) {
  const [pending, start] = useTransition();

  return (
    <div className="flex flex-wrap gap-1">
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() =>
          start(() => toggleDealerRolloutAction(dealer.id, !dealer.rolloutActive))
        }
      >
        {pending && <Loader2 className="h-3 w-3 animate-spin" />}
        Rollout
      </Button>
      <Button
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={() => start(() => toggleDealerActiveAction(dealer.id, !dealer.isActive))}
      >
        {dealer.isActive ? "비활성" : "활성"}
      </Button>
    </div>
  );
}
