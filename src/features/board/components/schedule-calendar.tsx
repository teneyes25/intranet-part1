import Link from "next/link";
import { ChevronLeft, ChevronRight, List, CalendarDays } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ScheduleEvent } from "@/features/board/queries";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;

const CATEGORY_TONES: Record<string, string> = {
  회의: "bg-sky-100 text-sky-900 hover:bg-sky-200",
  행사: "bg-emerald-100 text-emerald-900 hover:bg-emerald-200",
  마감: "bg-rose-100 text-rose-900 hover:bg-rose-200",
  기타: "bg-amber-100 text-amber-900 hover:bg-amber-200",
};

function dayKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function eventCoversDay(event: ScheduleEvent, day: Date): boolean {
  if (!event.startsAt) return false;
  const start = new Date(event.startsAt);
  const end = event.endsAt ? new Date(event.endsAt) : start;
  const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  const dayEnd = new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate(),
    23,
    59,
    59,
    999,
  );
  return start <= dayEnd && end >= dayStart;
}

function buildMonthCells(year: number, month: number) {
  const first = new Date(year, month, 1);
  const startPad = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: { date: Date; inMonth: boolean }[] = [];

  for (let i = startPad - 1; i >= 0; i--) {
    cells.push({
      date: new Date(year, month, -i),
      inMonth: false,
    });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(year, month, d), inMonth: true });
  }
  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1]!.date;
    cells.push({
      date: new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1),
      inMonth: false,
    });
  }
  return cells;
}

function monthHref(
  boardKey: string,
  year: number,
  month: number,
  extras: { category?: string; q?: string; view?: string },
) {
  const params = new URLSearchParams();
  params.set("year", String(year));
  params.set("month", String(month + 1));
  if (extras.view) params.set("view", extras.view);
  if (extras.category) params.set("category", extras.category);
  if (extras.q) params.set("q", extras.q);
  return `/boards/${boardKey}?${params.toString()}`;
}

export function ScheduleCalendar({
  boardKey,
  year,
  month,
  events,
  category,
  q,
}: {
  boardKey: string;
  year: number;
  month: number; // 0-indexed
  events: ScheduleEvent[];
  category?: string;
  q?: string;
}) {
  const cells = buildMonthCells(year, month);
  const today = new Date();
  const todayKey = dayKey(today);
  const prev = new Date(year, month - 1, 1);
  const next = new Date(year, month + 1, 1);
  const extras = { category, q };

  const byDay = new Map<string, ScheduleEvent[]>();
  for (const cell of cells) {
    if (!cell.inMonth) continue;
    const key = dayKey(cell.date);
    byDay.set(
      key,
      events.filter((e) => eventCoversDay(e, cell.date)),
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button asChild variant="outline" size="icon" className="h-8 w-8">
            <Link
              href={monthHref(boardKey, prev.getFullYear(), prev.getMonth(), {
                ...extras,
                view: "calendar",
              })}
              aria-label="이전 달"
            >
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h2 className="min-w-[8.5rem] text-center text-lg font-semibold tracking-tight">
            {year}년 {month + 1}월
          </h2>
          <Button asChild variant="outline" size="icon" className="h-8 w-8">
            <Link
              href={monthHref(boardKey, next.getFullYear(), next.getMonth(), {
                ...extras,
                view: "calendar",
              })}
              aria-label="다음 달"
            >
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className="ml-1">
            <Link
              href={monthHref(
                boardKey,
                today.getFullYear(),
                today.getMonth(),
                { ...extras, view: "calendar" },
              )}
            >
              오늘
            </Link>
          </Button>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="secondary" size="sm">
            <Link
              href={monthHref(boardKey, year, month, {
                ...extras,
                view: "calendar",
              })}
            >
              <CalendarDays className="h-4 w-4" />
              달력
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link
              href={monthHref(boardKey, year, month, {
                ...extras,
                view: "list",
              })}
            >
              <List className="h-4 w-4" />
              목록
            </Link>
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">
        <div className="grid grid-cols-7 border-b bg-muted/40 text-center text-xs font-medium text-muted-foreground">
          {WEEKDAYS.map((d, i) => (
            <div
              key={d}
              className={cn(
                "px-1 py-2",
                i === 0 && "text-rose-600",
                i === 6 && "text-sky-700",
              )}
            >
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 auto-rows-fr">
          {cells.map((cell) => {
            const key = dayKey(cell.date);
            const dayEvents = cell.inMonth ? (byDay.get(key) ?? []) : [];
            const isToday = key === todayKey;
            return (
              <div
                key={`${key}-${cell.inMonth ? "m" : "o"}`}
                className={cn(
                  "min-h-[6.5rem] border-b border-r p-1.5 last:border-r-0 sm:min-h-[7.5rem]",
                  !cell.inMonth && "bg-muted/20 text-muted-foreground/60",
                )}
              >
                <div
                  className={cn(
                    "mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs",
                    isToday &&
                      "bg-primary font-semibold text-primary-foreground",
                    cell.date.getDay() === 0 && !isToday && "text-rose-600",
                    cell.date.getDay() === 6 && !isToday && "text-sky-700",
                  )}
                >
                  {cell.date.getDate()}
                </div>
                <ul className="space-y-0.5">
                  {dayEvents.slice(0, 3).map((e) => (
                    <li key={e.id}>
                      <Link
                        href={`/boards/${boardKey}/${e.id}`}
                        className={cn(
                          "block truncate rounded px-1 py-0.5 text-[11px] leading-tight transition-colors",
                          CATEGORY_TONES[e.category ?? ""] ??
                            "bg-muted text-foreground hover:bg-muted/80",
                        )}
                        title={e.title}
                      >
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
    </div>
  );
}

export function ScheduleViewToggle({
  boardKey,
  year,
  month,
  view,
  category,
  q,
}: {
  boardKey: string;
  year: number;
  month: number;
  view: "calendar" | "list";
  category?: string;
  q?: string;
}) {
  const extras = { category, q };
  return (
    <div className="flex gap-2">
      <Button
        asChild
        variant={view === "calendar" ? "secondary" : "outline"}
        size="sm"
      >
        <Link
          href={monthHref(boardKey, year, month, {
            ...extras,
            view: "calendar",
          })}
        >
          <CalendarDays className="h-4 w-4" />
          달력
        </Link>
      </Button>
      <Button
        asChild
        variant={view === "list" ? "secondary" : "outline"}
        size="sm"
      >
        <Link
          href={monthHref(boardKey, year, month, { ...extras, view: "list" })}
        >
          <List className="h-4 w-4" />
          목록
        </Link>
      </Button>
    </div>
  );
}
