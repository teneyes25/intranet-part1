import type { Metadata } from "next";
import { Clock, LogIn, LogOut, CalendarDays } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/features/dashboard/components/stat-card";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = { title: "근태관리" };

const RECENT = [
  { date: "2026-06-12", checkIn: "08:52", checkOut: "18:10", status: "정상" },
  { date: "2026-06-11", checkIn: "08:47", checkOut: "18:30", status: "정상" },
  { date: "2026-06-10", checkIn: "09:12", checkOut: "18:05", status: "지각" },
];

export default function AttendancePage() {
  return (
    <div>
      <PageHeader
        title="근태관리"
        description="출퇴근 기록과 근태 현황을 관리합니다."
      />

      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <StatCard title="이번 달 근무일" value="11일" hint="6월" icon={CalendarDays} />
        <StatCard title="잔여 연차" value="9일" hint="2026년" icon={Clock} />
        <StatCard title="지각" value="1회" hint="이번 달" icon={LogIn} />
      </div>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>오늘 근태</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <Badge variant="success">출근 완료 · 08:52</Badge>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" disabled>
              <LogIn className="h-4 w-4" />
              출근
            </Button>
            <Button>
              <LogOut className="h-4 w-4" />
              퇴근
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>최근 기록</CardTitle>
        </CardHeader>
        <CardContent className="divide-y p-0">
          {RECENT.map((r) => (
            <div
              key={r.date}
              className="flex items-center gap-3 px-6 py-3 text-sm"
            >
              <span className="w-28 font-medium">{r.date}</span>
              <span className="text-muted-foreground">출근 {r.checkIn}</span>
              <span className="text-muted-foreground">퇴근 {r.checkOut}</span>
              <Badge
                variant={r.status === "정상" ? "success" : "destructive"}
                className="ml-auto"
              >
                {r.status}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
