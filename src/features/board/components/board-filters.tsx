"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ChevronDown, ChevronUp, RotateCcw, Search, Infinity as InfinityIcon, List } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { BoardPeriodPreset } from "@/features/board/board-search-utils";

const ALL = "__all__";
const PERIOD_OPTIONS: { value: BoardPeriodPreset; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "today", label: "오늘" },
  { value: "week", label: "이번 주" },
  { value: "month", label: "이번 달" },
];

export function BoardFilters({
  categories,
  productCategoryNames,
}: {
  categories: string[];
  /** 상품자료실 ProductCategory DB 이름 */
  productCategoryNames?: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [advancedOpen, setAdvancedOpen] = useState(
    Boolean(
      searchParams.get("author") ||
        searchParams.get("hasAttachment") ||
        searchParams.get("minViews"),
    ),
  );

  const categoryOptions = [
    ...categories,
    ...(productCategoryNames ?? []).filter((n) => !categories.includes(n)),
  ];
  const currentCategory = searchParams.get("category") ?? ALL;
  const currentPeriod = (searchParams.get("period") ?? "all") as BoardPeriodPreset;
  const infinite = searchParams.get("view") === "infinite";

  function submit(formData: FormData) {
    const params = new URLSearchParams();
    const q = String(formData.get("q") ?? "").trim();
    const category = String(formData.get("category") ?? "");
    const period = String(formData.get("period") ?? "all");
    const author = String(formData.get("author") ?? "").trim();
    const from = String(formData.get("from") ?? "");
    const to = String(formData.get("to") ?? "");
    const minViews = String(formData.get("minViews") ?? "").trim();
    const hasAttachment = formData.get("hasAttachment") === "on";

    if (q) params.set("q", q);
    if (category && category !== ALL) params.set("category", category);
    if (period && period !== "all") params.set("period", period);
    if (author) params.set("author", author);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (minViews) params.set("minViews", minViews);
    if (hasAttachment) params.set("hasAttachment", "1");
    if (infinite) params.set("view", "infinite");

    router.push(`${pathname}?${params.toString()}`);
  }

  function toggleView() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    if (infinite) params.delete("view");
    else params.set("view", "infinite");
    router.push(`${pathname}?${params.toString()}`);
  }

  function reset() {
    router.push(pathname);
  }

  return (
    <form action={submit} className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <div className="relative min-w-[180px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="q"
            defaultValue={searchParams.get("q") ?? ""}
            placeholder="키워드 검색"
            className="pl-9"
          />
        </div>

        <Select name="period" defaultValue={currentPeriod}>
          <SelectTrigger className="w-28">
            <SelectValue placeholder="기간" />
          </SelectTrigger>
          <SelectContent>
            {PERIOD_OPTIONS.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          name="author"
          defaultValue={searchParams.get("author") ?? ""}
          placeholder="작성자"
          className="w-28"
        />

        {categoryOptions.length > 0 && (
          <CategorySelect defaultValue={currentCategory} categories={categoryOptions} />
        )}

        <Button type="submit">
          <Search className="h-4 w-4" />
          검색
        </Button>
        <Button type="button" variant="outline" onClick={reset}>
          <RotateCcw className="h-4 w-4" />
          초기화
        </Button>
        <Button type="button" variant="outline" onClick={toggleView}>
          {infinite ? (
            <>
              <List className="h-4 w-4" />
              페이지
            </>
          ) : (
            <>
              <InfinityIcon className="h-4 w-4" />
              무한스크롤
            </>
          )}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setAdvancedOpen((v) => !v)}
        >
          고급 검색
          {advancedOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>

      {advancedOpen && (
        <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-muted/20 p-3">
          <div className="space-y-1">
            <Label htmlFor="from">시작일</Label>
            <Input
              id="from"
              type="date"
              name="from"
              defaultValue={searchParams.get("from") ?? ""}
              className="w-auto"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="to">종료일</Label>
            <Input
              id="to"
              type="date"
              name="to"
              defaultValue={searchParams.get("to") ?? ""}
              className="w-auto"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="minViews">최소 조회수</Label>
            <Input
              id="minViews"
              name="minViews"
              type="number"
              min={0}
              defaultValue={searchParams.get("minViews") ?? ""}
              className="w-28"
            />
          </div>
          <label className="flex cursor-pointer items-center gap-2 pb-2 text-sm">
            <input
              type="checkbox"
              name="hasAttachment"
              defaultChecked={searchParams.get("hasAttachment") === "1"}
              className="h-4 w-4 rounded border-input"
            />
            첨부파일 있음
          </label>
        </div>
      )}
    </form>
  );
}

function CategorySelect({
  defaultValue,
  categories,
}: {
  defaultValue: string;
  categories: string[];
}) {
  return (
    <Select name="category" defaultValue={defaultValue}>
      <SelectTrigger className="w-36">
        <SelectValue placeholder="카테고리" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>전체 카테고리</SelectItem>
        {categories.map((c) => (
          <SelectItem key={c} value={c}>
            {c}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
