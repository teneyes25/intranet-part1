"use client";

import type { AiIngestJob } from "@prisma/client";
import { useState, useTransition } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { runAiIngestAction } from "@/features/customize/actions";

export function AiLearningTab({
  jobs,
  boards,
}: {
  jobs: AiIngestJob[];
  boards: { key: string; name: string }[];
}) {
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<string[]>([]);

  function run(scope: "all" | "boards") {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("scope", scope);
      selected.forEach((k) => fd.append("boardKeys", k));
      const r = await runAiIngestAction(fd);
      if ("error" in r && r.error) toast.error(r.error);
      else if ("ok" in r && r.ok)
        toast.success(
          `재학습 완료: 게시글 ${r.postsProcessed}건, 청크 ${r.chunksTotal}개`,
        );
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Vector DB 재학습</CardTitle>
          <CardDescription>
            게시글을 재임베딩하여 AI Agent 검색 품질을 갱신합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button disabled={pending} onClick={() => run("all")}>
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            현재 인트라넷 전체 자료 재학습
          </Button>

          <div>
            <p className="mb-2 text-sm font-medium">게시판 선택 학습</p>
            <div className="flex flex-wrap gap-2">
              {boards.map((b) => (
                <label
                  key={b.key}
                  className="flex cursor-pointer items-center gap-1 rounded-full border px-3 py-1 text-xs"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(b.key)}
                    onChange={(e) =>
                      setSelected((prev) =>
                        e.target.checked
                          ? [...prev, b.key]
                          : prev.filter((k) => k !== b.key),
                      )
                    }
                  />
                  {b.name}
                </label>
              ))}
            </div>
            <Button
              className="mt-3"
              variant="outline"
              disabled={pending || selected.length === 0}
              onClick={() => run("boards")}
            >
              선택 게시판만 학습
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">학습 이력</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b text-left text-muted-foreground">
              <tr>
                <th className="py-2 pr-4">시각</th>
                <th className="py-2 pr-4">범위</th>
                <th className="py-2 pr-4">상태</th>
                <th className="py-2 pr-4">게시글</th>
                <th className="py-2">청크</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-muted-foreground">
                    학습 이력이 없습니다.
                  </td>
                </tr>
              ) : (
                jobs.map((j) => (
                  <tr key={j.id}>
                    <td className="py-2 pr-4 text-xs">
                      {new Intl.DateTimeFormat("ko-KR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      }).format(j.startedAt)}
                    </td>
                    <td className="py-2 pr-4">
                      {j.scope === "all" ? "전체" : j.boardKeys.join(", ")}
                    </td>
                    <td className="py-2 pr-4">
                      <Badge
                        variant={
                          j.status === "completed"
                            ? "default"
                            : j.status === "failed"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {j.status}
                      </Badge>
                    </td>
                    <td className="py-2 pr-4">{j.postsProcessed}</td>
                    <td className="py-2">{j.chunksTotal}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
