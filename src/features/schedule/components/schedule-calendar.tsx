"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ScheduleEvent } from "@/features/schedule/queries";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export type CalendarView = "month" | "week";

interface ScheduleCalendarProps {
  boardKey: string;
  year: number;
  month: number;
  events: ScheduleEvent[];
  view?: CalendarView;
  /** ISO date YYYY-MM-DD — week view 기준일 (없으면 오늘) */
  weekStart?: string;
  baseQuery?: string;
}

function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function startOfWeek(d: Date) {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  copy.setDate(copy.getDate() - copy.getDay());
  return copy;
}

function addDays(d: Date, n: number) {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

export function ScheduleCalendar({
  boardKey,
  year,
  month,
  events,
  view = "month",
  weekStart,
  baseQuery = "",
}: ScheduleCalendarProps) {
  const prev = month === 1 ? { y: year - 1, m: 12 } : { y: year, m: month - 1 };
  const next = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 };

  const anchorDate = useMemo(() => {
    if (weekStart) {
      const [y, m, d] = weekStart.split("-").map(Number);
      if (y && m && d) return new Date(y, m - 1, d);
    }
    return new Date(year, month - 1, 1);
  }, [weekStart, year, month]);

  const weekAnchor = useMemo(() => startOfWeek(anchorDate), [anchorDate]);
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekAnchor, i)),
    [weekAnchor],
  );

  const eventsByDay = useMemo(() => {
    const map = new Map<string, ScheduleEvent[]>();
    for (const e of events) {
      const key = dayKey(e.eventStart);
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

  const todayKey = dayKey(new Date());

  function buildQuery(extra: Record<string, string>) {
    const params = new URLSearchParams(baseQuery.replace(/^\?/, ""));
    for (const [k, v] of Object.entries(extra)) {
      if (v) params.set(k, v);
      else params.delete(k);
    }
    const q = params.toString();
    return q ? `&${q}` : "";
  }

  function hrefFor(y: number, m: number, extra?: Record<string, string>) {
    const mm = String(m).padStart(2, "0");
    return `/boards/${boardKey}?month=${y}-${mm}${buildQuery(extra ?? {})}`;
  }

  const prevWeek = addDays(weekAnchor, -7);
  const nextWeek = addDays(weekAnchor, 7);

  return (
    <div className="surface-card overflow-hidden shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 bg-muted/20 px-4 py-3.5">
        <div className="flex items-center gap-1">
          <Button asChild variant="ghost" size="icon" className="touch-target-sm">
            <Link
              href={
                view === "week"
                  ? hrefFor(prevWeek.getFullYear(), prevWeek.getMonth() + 1, {
                      calView: "week",
                      week: dayKey(prevWeek),
                    })
                  : hrefFor(prev.y, prev.m, { calView: "month" })
              }
              aria-label={view === "week" ? "이전 주" : "이전 달"}
            >
              <ChevronLeft className="h-5 w-5" />
            </Link>
          </Button>
          <Button asChild variant="ghost" size="icon" className="touch-target-sm">
            <Link
              href={
                view === "week"
                  ? hrefFor(nextWeek.getFullYear(), nextWeek.getMonth() + 1, {
                      calView: "week",
                      week: dayKey(nextWeek),
                    })
                  : hrefFor(next.y, next.m, { calView: "month" })
              }
              aria-label={view === "week" ? "다음 주" : "다음 달"}
            >
              <ChevronRight className="h-5 w-5" />
            </Link>
          </Button>
        </div>

        <h2 className="text-lg font-semibold">
          {view === "week"
            ? `${weekDays[0]!.getMonth() + 1}/${weekDays[0]!.getDate()} – ${weekDays[6]!.getMonth() + 1}/${weekDays[6]!.getDate()}`
            : `${year}년 ${month}월`}
        </h2>

        <div className="flex rounded-lg border border-border/60 p-0.5">
          <Link
            href={hrefFor(year, month, { calView: "month" })}
            className={cn(
              "rounded-md px-3 py-1 text-xs font-medium transition-colors",
              view === "month" ? "bg-primary text-primary-foreground" : "hover:bg-muted",
            )}
          >
            월
          </Link>
          <Link
            href={hrefFor(year, month, {
              calView: "week",
              week: dayKey(new Date(year, month - 1, 15)),
            })}
            className={cn(
              "rounded-md px-3 py-1 text-xs font-medium transition-colors",
              view === "week" ? "bg-primary text-primary-foreground" : "hover:bg-muted",
            )}
          >
            주
          </Link>
        </div>
      </div>

      {view === "week" ? (
        <>
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
          <div className="grid grid-cols-7 divide-x">
            {weekDays.map((date, i) => {
              const key = dayKey(date);
              const dayEvents = eventsByDay.get(key) ?? [];
              const isToday = key === todayKey;
              return (
                <div
                  key={key}
                  className={cn(
                    "min-h-[140px] p-2 sm:min-h-[180px]",
                    isToday && "bg-accent/[0.06]",
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold",
                      isToday ? "bg-accent text-accent-foreground" : "",
                    )}
                  >
                    {date.getDate()}
                  </span>
                  <ul className="mt-2 space-y-1">
                    {dayEvents.map((e) => (
                      <li key={e.id}>
                        <Link
                          href={e.href}
                          className="block rounded-md border border-border/50 bg-card px-1.5 py-1 text-[10px] leading-tight hover:border-primary/30 sm:text-xs"
                        >
                          {e.category && (
                            <Badge variant="outline" className="mb-0.5 h-4 px-1 text-[9px]">
                              {e.category}
                            </Badge>
                          )}
                          <span className="line-clamp-2 font-medium">{e.title}</span>
                        </Link>
                      </li>
                    ))}
                    {dayEvents.length === 0 && (
                      <li className="text-[10px] text-muted-foreground/60">—</li>
                    )}
                  </ul>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <>
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
                return (
                  <div key={`empty-${idx}`} className="min-h-[88px] border-b border-r bg-muted/10" />
                );
              }
              const date = new Date(year, month - 1, day);
              const key = dayKey(date);
              const dayEvents = eventsByDay.get(key) ?? [];
              const isToday = key === todayKey;

              return (
                <div
                  key={key}
                  className={`min-h-[88px] border-b border-r p-1.5 transition-colors sm:p-2 ${
                    isToday ? "bg-accent/[0.06]" : "hover:bg-muted/20"
                  }`}
                >
                  <Link
                    href={hrefFor(year, month, { calView: "week", week: key })}
                    className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold hover:ring-2 hover:ring-primary/20 ${
                      isToday ? "bg-accent text-accent-foreground shadow-soft" : "text-foreground"
                    }`}
                    title="주간 보기"
                  >
                    {day}
                  </Link>
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
        </>
      )}
    </div>
  );
}
