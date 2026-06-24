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
import { SEARCH_SOURCES } from "@/features/search/constants";

interface Props {
  initialQ?: string;
  initialSource?: string;
  initialSemantic?: boolean;
}

export function SearchForm({
  initialQ = "",
  initialSource = "all",
  initialSemantic = false,
}: Props) {
  const router = useRouter();
  const [q, setQ] = useState(initialQ);
  const [source, setSource] = useState(initialSource);
  const [semantic, setSemantic] = useState(initialSemantic);

  function submit(e: FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (source !== "all") params.set("source", source);
    if (semantic) params.set("semantic", "1");
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
    </form>
  );
}
