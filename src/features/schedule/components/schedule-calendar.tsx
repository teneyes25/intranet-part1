"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ScheduleEvent } from "@/features/schedule/queries";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

interface ScheduleCalendarProps {
  boardKey: string;
  year: number;
  month: number;
  events: ScheduleEvent[];
  /** 현재 URL searchParams 유지용 */
  baseQuery?: string;
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function ScheduleCalendar({
  boardKey,
  year,
  month,
  events,
  baseQuery = "",
}: ScheduleCalendarProps) {
  const prev = month === 1 ? { y: year - 1, m: 12 } : { y: year, m: month - 1 };
  const next = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 };

  const eventsByDay = useMemo(() => {
    const map = new Map<string, ScheduleEvent[]>();
    for (const e of events) {
      const key = monthKey(e.eventStart);
      const list = map.get(key) ?? [];
      list.push(e);
      map.set(key, list);
    }
    return map;
  }, [events]);

  const firstDay = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const startOffset = firstDay.getDay();
  const cells: (number | null)[] = [
    ...Array.from({ length: startOffset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const todayKey = monthKey(new Date());

  function hrefFor(y: number, m: number) {
    const mm = String(m).padStart(2, "0");
    const q = baseQuery ? `&${baseQuery.replace(/^\?/, "")}` : "";
    return `/boards/${boardKey}?month=${y}-${mm}${q}`;
  }

  return (
    <div className="surface-card overflow-hidden shadow-card">
      <div className="flex items-center justify-between border-b border-border/50 bg-muted/20 px-4 py-3.5">
        <Button asChild variant="ghost" size="icon" className="touch-target-sm">
          <Link href={hrefFor(prev.y, prev.m)} aria-label="이전 달">
            <ChevronLeft className="h-5 w-5" />
          </Link>
        </Button>
        <h2 className="text-lg font-semibold">
          {year}년 {month}월
        </h2>
        <Button asChild variant="ghost" size="icon" className="touch-target-sm">
          <Link href={hrefFor(next.y, next.m)} aria-label="다음 달">
            <ChevronRight className="h-5 w-5" />
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-7 border-b bg-muted/30 text-center text-xs font-medium text-muted-foreground">
        {WEEKDAYS.map((d, i) => (
          <div
            key={d}
            className={`py-2 ${i === 0 ? "text-destructive" : i === 6 ? "text-primary" : ""}`}
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {cells.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} className="min-h-[88px] border-b border-r bg-muted/10" />;
          }
          const date = new Date(year, month - 1, day);
          const key = monthKey(date);
          const dayEvents = eventsByDay.get(key) ?? [];
          const isToday = key === todayKey;

          return (
            <div
              key={key}
              className={`min-h-[88px] border-b border-r p-1.5 transition-colors sm:p-2 ${
                isToday ? "bg-accent/[0.06]" : "hover:bg-muted/20"
              }`}
            >
              <span
                className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                  isToday ? "bg-accent text-accent-foreground shadow-soft" : "text-foreground"
                }`}
              >
                {day}
              </span>
              <ul className="mt-1 space-y-0.5">
                {dayEvents.slice(0, 3).map((e) => (
                  <li key={e.id}>
                    <Link
                      href={e.href}
                      className="block truncate rounded px-1 py-0.5 text-[10px] leading-tight hover:bg-muted/60 sm:text-xs"
                      title={e.title}
                    >
                      {e.category && (
                        <Badge variant="outline" className="mr-0.5 h-4 px-1 text-[9px]">
                          {e.category}
                        </Badge>
                      )}
                      {e.title}
                    </Link>
                  </li>
                ))}
                {dayEvents.length > 3 && (
                  <li className="px-1 text-[10px] text-muted-foreground">
                    +{dayEvents.length - 3}건
                  </li>
                )}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
