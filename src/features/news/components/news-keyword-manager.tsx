"use client";

import { useState, useTransition } from "react";
import { Loader2, Play, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  addNewsKeywordAction,
  deleteNewsKeywordAction,
  toggleNewsKeywordAction,
  triggerNewsCollectAction,
} from "@/features/news/actions";
import { MAX_NEWS_KEYWORDS, NEWS_CATEGORIES } from "@/features/news/keyword-constants";
import type { NewsKeyword } from "@prisma/client";

export function NewsKeywordManager({ keywords }: { keywords: NewsKeyword[] }) {
  const [pending, startTransition] = useTransition();
  const [collectMsg, setCollectMsg] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          등록 {keywords.length}/{MAX_NEWS_KEYWORDS} · 게시 카테고리: 자동수집 · 관리자 로그인 시 1일 1회
        </p>
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              setCollectMsg(null);
              const r = await triggerNewsCollectAction();
              const published =
                r.results?.filter((x) => x.status === "published").length ?? 0;
              const errors =
                r.results?.filter((x) => x.status === "error").length ?? 0;
              const skipped =
                r.results?.filter((x) => x.status === "skipped").length ?? 0;
              const noResult =
                r.results?.filter((x) => x.status === "no-result").length ?? 0;
              setCollectMsg(
                `수집 완료 — 게시 ${published}건 · 오류 ${errors} · 중복 ${skipped} · 결과없음 ${noResult}`,
              );
            })
          }
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          지금 수집 테스트
        </Button>
      </div>
      {collectMsg && (
        <p className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground">
          {collectMsg}
        </p>
      )}

      <form
        action={(fd) =>
          startTransition(async () => {
            await addNewsKeywordAction(fd);
          })
        }
        className="flex flex-wrap gap-2"
      >
        <Input
          name="keyword"
          placeholder="검색 키워드"
          className="max-w-xs"
          disabled={keywords.length >= MAX_NEWS_KEYWORDS}
        />
        <select
          name="category"
          className="h-10 rounded-md border bg-background px-3 text-sm"
          defaultValue="건설"
        >
          {NEWS_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <Button
          type="submit"
          disabled={keywords.length >= MAX_NEWS_KEYWORDS || pending}
        >
          추가
        </Button>
      </form>

      <div className="overflow-hidden rounded-xl border border-border/60 shadow-card">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">키워드</th>
              <th className="px-4 py-3">분야</th>
              <th className="px-4 py-3">상태</th>
              <th className="px-4 py-3">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {keywords.map((kw) => (
              <tr key={kw.id}>
                <td className="px-4 py-3 font-medium">{kw.keyword}</td>
                <td className="px-4 py-3">
                  <Badge variant="secondary">{kw.category}</Badge>
                </td>
                <td className="px-4 py-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      startTransition(() =>
                        toggleNewsKeywordAction(kw.id, !kw.isActive),
                      )
                    }
                  >
                    {kw.isActive ? "활성" : "비활성"}
                  </Button>
                </td>
                <td className="px-4 py-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      startTransition(() => deleteNewsKeywordAction(kw.id))
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
