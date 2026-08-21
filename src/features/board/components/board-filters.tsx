"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, RotateCcw, Infinity as InfinityIcon, List } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL = "__all__";

export function BoardFilters({
  categories,
  mode = "default",
}: {
  categories: string[];
  mode?: "default" | "schedule";
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentCategory = searchParams.get("category") ?? ALL;
  const infinite = searchParams.get("view") === "infinite";
  const isSchedule = mode === "schedule";

  function submit(formData: FormData) {
    const params = new URLSearchParams();
    const q = String(formData.get("q") ?? "").trim();
    const category = String(formData.get("category") ?? "");
    const from = String(formData.get("from") ?? "");
    const to = String(formData.get("to") ?? "");

    if (q) params.set("q", q);
    if (category && category !== ALL) params.set("category", category);

    if (isSchedule) {
      const year = searchParams.get("year");
      const month = searchParams.get("month");
      const view = searchParams.get("view") ?? "calendar";
      if (year) params.set("year", year);
      if (month) params.set("month", month);
      if (view) params.set("view", view);
    } else {
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      if (infinite) params.set("view", "infinite");
    }

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
    if (isSchedule) {
      const view = searchParams.get("view") ?? "calendar";
      router.push(`${pathname}?view=${view}`);
      return;
    }
    router.push(pathname);
  }

  return (
    <form action={submit} className="flex flex-wrap items-end gap-2">
      <div className="relative min-w-[180px] flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          name="q"
          defaultValue={searchParams.get("q") ?? ""}
          placeholder="키워드 검색"
          className="pl-9"
        />
      </div>

      {categories.length > 0 && (
        <CategorySelect defaultValue={currentCategory} categories={categories} />
      )}

      {!isSchedule && (
        <>
          <Input
            type="date"
            name="from"
            defaultValue={searchParams.get("from") ?? ""}
            className="w-auto"
            aria-label="시작일"
          />
          <span className="pb-2 text-muted-foreground">~</span>
          <Input
            type="date"
            name="to"
            defaultValue={searchParams.get("to") ?? ""}
            className="w-auto"
            aria-label="종료일"
          />
        </>
      )}

      <Button type="submit">
        <Search className="h-4 w-4" />
        검색
      </Button>
      <Button type="button" variant="outline" onClick={reset}>
        <RotateCcw className="h-4 w-4" />
        초기화
      </Button>
      {!isSchedule && (
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
