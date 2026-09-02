"use client";

import { useMemo, useState, useTransition } from "react";
import { Loader2, Play, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { NewsCategory, NewsKeyword } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  addNewsCategoryAction,
  addNewsKeywordAction,
  deleteNewsCategoryAction,
  deleteNewsKeywordAction,
  saveAllNewsKeywordsAction,
  triggerNewsCollectAction,
  updateNewsCategoryAction,
} from "@/features/news/actions";
import { MAX_NEWS_KEYWORDS } from "@/features/news/keyword-constants";

type Row = {
  id: string;
  keyword: string;
  category: string;
  isActive: boolean;
};

export function NewsKeywordManager({
  keywords,
  categories,
}: {
  keywords: NewsKeyword[];
  categories: NewsCategory[];
}) {
  const [pending, startTransition] = useTransition();
  const [collectMsg, setCollectMsg] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>(
    keywords.map((k) => ({
      id: k.id,
      keyword: k.keyword,
      category: k.category,
      isActive: k.isActive,
    })),
  );
  const catNames = useMemo(() => categories.map((c) => c.name), [categories]);

  function saveAll() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("payload", JSON.stringify(rows));
      const r = await saveAllNewsKeywordsAction(fd);
      if (r.error) toast.error(r.error);
      else toast.success("키워드 변경 내용을 저장했습니다.");
    });
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          등록 {rows.length}/{MAX_NEWS_KEYWORDS} · 변경 후 「변경 내용 저장」을 눌러야 DB에
          유지됩니다.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={saveAll} disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            변경 내용 저장
          </Button>
          <Button
            variant="outline"
            size="default"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                setCollectMsg(null);
                const r = await triggerNewsCollectAction();
                const published =
                  r.results?.filter((x) => x.status === "published").length ?? 0;
                setCollectMsg(`수집 완료 — 게시 ${published}건`);
              })
            }
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            지금 수집 테스트
          </Button>
        </div>
      </div>
      {collectMsg && (
        <p className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
          {collectMsg}
        </p>
      )}

      {/* Categories CRUD */}
      <section className="space-y-3 rounded-xl border p-4">
        <h3 className="text-sm font-semibold">분야(카테고리) 관리</h3>
        <form
          className="flex flex-wrap gap-2"
          action={(fd) =>
            startTransition(async () => {
              const r = await addNewsCategoryAction(fd);
              if (r.error) toast.error(r.error);
              else toast.success("카테고리를 추가했습니다.");
            })
          }
        >
          <Input name="name" placeholder="새 분야 이름" className="max-w-xs" required />
          <Button type="submit" disabled={pending}>
            <Plus className="h-4 w-4" />
            추가
          </Button>
        </form>
        <ul className="space-y-2">
          {categories.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center gap-2">
              <form
                className="flex flex-wrap items-center gap-2"
                action={(fd) =>
                  startTransition(async () => {
                    const r = await updateNewsCategoryAction(fd);
                    if (r.error) toast.error(r.error);
                    else toast.success("카테고리를 수정했습니다.");
                  })
                }
              >
                <input type="hidden" name="id" value={c.id} />
                <Input name="name" defaultValue={c.name} className="h-9 w-40" />
                <Button type="submit" size="sm" variant="outline" disabled={pending}>
                  수정
                </Button>
              </form>
              <form
                action={(fd) =>
                  startTransition(async () => {
                    if (!window.confirm(`「${c.name}」 카테고리를 삭제할까요?`)) return;
                    const r = await deleteNewsCategoryAction(fd);
                    if (r.error) toast.error(r.error);
                    else toast.success("삭제했습니다.");
                  })
                }
              >
                <input type="hidden" name="id" value={c.id} />
                <Button type="submit" size="sm" variant="ghost" disabled={pending}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </form>
            </li>
          ))}
        </ul>
      </section>

      {/* Add keyword */}
      <form
        action={(fd) =>
          startTransition(async () => {
            const r = await addNewsKeywordAction(fd);
            if (r?.error) toast.error(r.error);
            else toast.success("키워드를 추가했습니다.");
          })
        }
        className="flex flex-wrap gap-2"
      >
        <Input
          name="keyword"
          placeholder="검색 키워드"
          className="max-w-xs"
          disabled={rows.length >= MAX_NEWS_KEYWORDS}
        />
        <select
          name="category"
          className="h-10 rounded-md border bg-background px-3 text-sm"
          defaultValue={catNames[0] ?? ""}
        >
          {catNames.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <Button type="submit" disabled={rows.length >= MAX_NEWS_KEYWORDS || pending}>
          키워드 추가
        </Button>
      </form>

      <div className="overflow-hidden rounded-xl border shadow-card">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-3">키워드</th>
              <th className="px-4 py-3">분야</th>
              <th className="px-4 py-3">상태</th>
              <th className="px-4 py-3">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((row, idx) => (
              <tr key={row.id}>
                <td className="px-4 py-2">
                  <Input
                    value={row.keyword}
                    onChange={(e) =>
                      setRows((prev) =>
                        prev.map((r, i) =>
                          i === idx ? { ...r, keyword: e.target.value } : r,
                        ),
                      )
                    }
                    className="h-9"
                  />
                </td>
                <td className="px-4 py-2">
                  <select
                    value={row.category}
                    onChange={(e) =>
                      setRows((prev) =>
                        prev.map((r, i) =>
                          i === idx ? { ...r, category: e.target.value } : r,
                        ),
                      )
                    }
                    className="h-9 rounded-md border bg-background px-2 text-sm"
                  >
                    {catNames.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-2">
                  <label className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={row.isActive}
                      onChange={(e) =>
                        setRows((prev) =>
                          prev.map((r, i) =>
                            i === idx ? { ...r, isActive: e.target.checked } : r,
                          ),
                        )
                      }
                    />
                    활성
                  </label>
                </td>
                <td className="px-4 py-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      startTransition(async () => {
                        if (!window.confirm("이 키워드를 삭제할까요?")) return;
                        await deleteNewsKeywordAction(row.id);
                        setRows((prev) => prev.filter((r) => r.id !== row.id));
                        toast.success("삭제했습니다.");
                      })
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
