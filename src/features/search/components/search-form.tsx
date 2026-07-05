"use client";

import { useRouter } from "next/navigation";
import { useState, FormEvent } from "react";
import { Search, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type BoardPeriodPreset,
  resolvePeriodRange,
} from "@/features/board/board-search-utils";
import { SEARCH_SOURCES } from "@/features/search/constants";

interface Props {
  initialQ?: string;
  initialSource?: string;
  initialSemantic?: boolean;
  initialAuthor?: string;
  initialHasAttachment?: boolean;
  initialMinViews?: string;
  initialPeriod?: BoardPeriodPreset;
}

const PERIOD_OPTIONS: { value: BoardPeriodPreset; label: string }[] = [
  { value: "all", label: "전체 기간" },
  { value: "today", label: "오늘" },
  { value: "week", label: "최근 1주" },
  { value: "month", label: "최근 1개월" },
];

export function SearchForm({
  initialQ = "",
  initialSource = "all",
  initialSemantic = false,
  initialAuthor = "",
  initialHasAttachment = false,
  initialMinViews = "",
  initialPeriod = "all",
}: Props) {
  const router = useRouter();
  const [q, setQ] = useState(initialQ);
  const [source, setSource] = useState(initialSource);
  const [semantic, setSemantic] = useState(initialSemantic);
  const [author, setAuthor] = useState(initialAuthor);
  const [hasAttachment, setHasAttachment] = useState(initialHasAttachment);
  const [minViews, setMinViews] = useState(initialMinViews);
  const [period, setPeriod] = useState<BoardPeriodPreset>(initialPeriod);

  function submit(e: FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (source !== "all") params.set("source", source);
    if (semantic) params.set("semantic", "1");
    if (author.trim()) params.set("author", author.trim());
    if (hasAttachment) params.set("hasAttachment", "1");
    if (minViews.trim()) params.set("minViews", minViews.trim());
    if (period !== "all") params.set("period", period);

    const range = resolvePeriodRange(period);
    if (range.from) params.set("from", range.from.toISOString().slice(0, 10));
    if (range.to) params.set("to", range.to.toISOString().slice(0, 10));

    router.push(`/search?${params.toString()}`);
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl border bg-card p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="키워드를 입력하세요 (제목, 내용, 문서...)"
            className="pl-9"
          />
        </div>
        <Button type="submit" className="shrink-0">
          검색
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">출처</Label>
          <Select value={source} onValueChange={setSource}>
            <SelectTrigger className="h-8 w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SEARCH_SOURCES.map((s) => (
                <SelectItem key={s.key} value={s.key}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">기간</Label>
          <Select value={period} onValueChange={(v) => setPeriod(v as BoardPeriodPreset)}>
            <SelectTrigger className="h-8 w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={semantic}
            onChange={(e) => setSemantic(e.target.checked)}
            className="rounded border-input"
          />
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          AI 의미 검색
        </label>
      </div>

      <div className="flex flex-wrap items-end gap-3 border-t pt-4">
        <div className="min-w-[140px] flex-1 space-y-1">
          <Label htmlFor="search-author" className="text-xs text-muted-foreground">
            작성자
          </Label>
          <Input
            id="search-author"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="이름 검색"
          />
        </div>
        <div className="w-28 space-y-1">
          <Label htmlFor="search-min-views" className="text-xs text-muted-foreground">
            최소 조회수
          </Label>
          <Input
            id="search-min-views"
            type="number"
            min={0}
            value={minViews}
            onChange={(e) => setMinViews(e.target.value)}
            placeholder="0"
          />
        </div>
        <label className="flex cursor-pointer items-center gap-2 pb-2 text-sm">
          <input
            type="checkbox"
            checked={hasAttachment}
            onChange={(e) => setHasAttachment(e.target.checked)}
            className="rounded border-input"
          />
          첨부파일 있음
        </label>
      </div>
    </form>
  );
}
