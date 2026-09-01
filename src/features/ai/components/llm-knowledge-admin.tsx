"use client";

import { useState, useTransition } from "react";
import { BookOpen, Loader2, RefreshCw, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createKnowledgeMaterialAction,
  deleteKnowledgeMaterialAction,
  saveLearningSettingsAction,
  syncKnowledgeAction,
  toggleKnowledgeMaterialAction,
} from "@/features/ai/llm-admin-actions";

type Material = {
  id: string;
  title: string;
  content: string;
  fileName: string | null;
  isActive: boolean;
  updatedAt: Date | string;
  createdBy: { name: string };
};

type IngestJob = {
  id: string;
  scope: string;
  status: string;
  postsProcessed: number;
  chunksTotal: number;
  errorMessage: string | null;
  startedAt: Date | string;
  completedAt: Date | string | null;
};

export function LlmKnowledgeAdmin({
  settings,
  materials,
  boards,
  jobs,
}: {
  settings: { learnAllIntranet: boolean; learnCurated: boolean };
  materials: Material[];
  boards: { key: string; name: string }[];
  jobs: IngestJob[];
}) {
  const [pending, start] = useTransition();
  const [learnAll, setLearnAll] = useState(settings.learnAllIntranet);
  const [learnCurated, setLearnCurated] = useState(settings.learnCurated);
  const [selectedBoards, setSelectedBoards] = useState<string[]>([]);

  return (
    <div className="space-y-8">
      <section className="space-y-4 rounded-lg border p-4">
        <div className="flex items-start gap-2">
          <BookOpen className="mt-0.5 h-5 w-5 text-[#5C7358]" />
          <div>
            <h3 className="font-semibold">지식 동기화</h3>
            <p className="text-sm text-muted-foreground">
              인트라넷 자료를 매종이 검색용 Vector DB에 반영합니다. 기본값은
              <strong> 전체 학습 ON</strong>입니다. 매종이는 자료를 비판적으로
              검토하고, 오류·모순이 있으면 인정·주의를 말하도록 설정되어 있습니다.
            </p>
          </div>
        </div>

        <form
          className="flex flex-wrap items-end gap-4"
          action={(fd) =>
            start(async () => {
              fd.set("learnAllIntranet", learnAll ? "on" : "");
              fd.set("learnCurated", learnCurated ? "on" : "");
              const r = await saveLearningSettingsAction(fd);
              if ("error" in r && typeof r.error === "string") toast.error(r.error);
              else toast.success("학습 정책을 저장했습니다.");
            })
          }
        >
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={learnAll}
              onChange={(e) => setLearnAll(e.target.checked)}
            />
            인트라넷 전체 학습 (게시글·문서함·전자결재) — 기본
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={learnCurated}
              onChange={(e) => setLearnCurated(e.target.checked)}
            />
            지정·업로드 학습 자료 포함
          </label>
          <Button type="submit" size="sm" variant="outline" disabled={pending}>
            정책 저장
          </Button>
        </form>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const fd = new FormData();
                fd.set("scope", "all");
                const r = await syncKnowledgeAction(fd);
                if ("error" in r && r.error) toast.error(r.error);
                else if ("ok" in r && r.ok) {
                  toast.success(
                    `지식 동기화 완료: 게시글 ${r.postsProcessed} · 문서 ${r.documentsProcessed} · 결재 ${r.approvalsProcessed} · 지정 ${r.curatedProcessed ?? 0} / 청크 ${r.chunksTotal}`,
                  );
                }
              })
            }
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            지식 동기화 (전체)
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const fd = new FormData();
                fd.set("scope", "curated");
                const r = await syncKnowledgeAction(fd);
                if ("error" in r && r.error) toast.error(r.error);
                else if ("ok" in r && r.ok) {
                  toast.success(
                    `지정 자료 동기화: ${r.curatedProcessed ?? 0}건 / 청크 ${r.chunksTotal}`,
                  );
                }
              })
            }
          >
            지정 자료만 동기화
          </Button>
        </div>

        {boards.length > 0 && (
          <div className="space-y-2 rounded-md border bg-muted/20 p-3">
            <p className="text-xs font-medium text-muted-foreground">
              게시판만 선택 동기화
            </p>
            <div className="flex flex-wrap gap-2">
              {boards.map((b) => {
                const on = selectedBoards.includes(b.key);
                return (
                  <button
                    key={b.key}
                    type="button"
                    className={
                      on
                        ? "rounded-full bg-primary px-2.5 py-1 text-xs text-primary-foreground"
                        : "rounded-full border px-2.5 py-1 text-xs hover:bg-muted"
                    }
                    onClick={() =>
                      setSelectedBoards((prev) =>
                        on ? prev.filter((k) => k !== b.key) : [...prev, b.key],
                      )
                    }
                  >
                    {b.name}
                  </button>
                );
              })}
            </div>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={pending || selectedBoards.length === 0}
              onClick={() =>
                start(async () => {
                  const fd = new FormData();
                  fd.set("scope", "boards");
                  selectedBoards.forEach((k) => fd.append("boardKeys", k));
                  const r = await syncKnowledgeAction(fd);
                  if ("error" in r && r.error) toast.error(r.error);
                  else if ("ok" in r && r.ok) {
                    toast.success(
                      `선택 게시판 동기화: 게시글 ${r.postsProcessed} / 청크 ${r.chunksTotal}`,
                    );
                  }
                })
              }
            >
              선택 게시판 동기화
            </Button>
          </div>
        )}

        {jobs.length > 0 && (
          <div className="overflow-x-auto text-xs">
            <p className="mb-1 font-medium">최근 동기화</p>
            <table className="w-full text-left">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="py-1 pr-2">시각</th>
                  <th className="py-1 pr-2">범위</th>
                  <th className="py-1 pr-2">상태</th>
                  <th className="py-1 pr-2">게시글</th>
                  <th className="py-1">청크</th>
                </tr>
              </thead>
              <tbody>
                {jobs.slice(0, 5).map((j) => (
                  <tr key={j.id} className="border-t">
                    <td className="py-1 pr-2">
                      {new Date(j.startedAt).toLocaleString("ko-KR")}
                    </td>
                    <td className="py-1 pr-2">{j.scope}</td>
                    <td className="py-1 pr-2">
                      {j.status}
                      {j.errorMessage ? ` (${j.errorMessage})` : ""}
                    </td>
                    <td className="py-1 pr-2">{j.postsProcessed}</td>
                    <td className="py-1">{j.chunksTotal}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-4 rounded-lg border p-4">
        <div>
          <h3 className="font-semibold">학습 자료 지정·업로드</h3>
          <p className="text-sm text-muted-foreground">
            매종이가 특별히 학습할 정책·매뉴얼·FAQ 등을 직접 등록합니다.
            텍스트 붙여넣기 또는 .txt/.md/.csv/.json 파일 업로드를 지원합니다.
          </p>
        </div>

        <form
          className="space-y-3 rounded-md border bg-[#F7F8F6] p-3"
          action={(fd) =>
            start(async () => {
              const r = await createKnowledgeMaterialAction(fd);
              if (r.error) toast.error(r.error);
              else toast.success("학습 자료를 등록·색인했습니다.");
            })
          }
        >
          <div className="space-y-1">
            <Label>제목</Label>
            <Input name="title" required placeholder="예: 연차 사용 규정 요약" />
          </div>
          <div className="space-y-1">
            <Label>본문 (텍스트)</Label>
            <textarea
              name="content"
              rows={5}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="학습시킬 내용을 입력하세요…"
            />
          </div>
          <div className="space-y-1">
            <Label>파일 업로드 (선택)</Label>
            <Input name="file" type="file" accept=".txt,.md,.csv,.json,.log,text/*" />
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            자료 등록·학습
          </Button>
        </form>

        <ul className="divide-y rounded-md border">
          {materials.length === 0 && (
            <li className="px-3 py-4 text-sm text-muted-foreground">
              등록된 지정 학습 자료가 없습니다.
            </li>
          )}
          {materials.map((m) => (
            <li
              key={m.id}
              id={`knowledge-${m.id}`}
              className="flex flex-wrap items-start justify-between gap-2 px-3 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {m.title}{" "}
                  {!m.isActive && (
                    <span className="text-xs text-muted-foreground">(비활성)</span>
                  )}
                </p>
                <p className="line-clamp-2 text-xs text-muted-foreground">
                  {m.fileName ? `파일: ${m.fileName} · ` : ""}
                  {m.content.slice(0, 160)}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {m.createdBy.name} ·{" "}
                  {new Date(m.updatedAt).toLocaleString("ko-KR")}
                </p>
              </div>
              <div className="flex gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      const fd = new FormData();
                      fd.set("id", m.id);
                      fd.set("isActive", m.isActive ? "false" : "true");
                      const r = await toggleKnowledgeMaterialAction(fd);
                      if (r.error) toast.error(r.error);
                      else toast.success(m.isActive ? "비활성화" : "활성화·재학습");
                    })
                  }
                >
                  {m.isActive ? "끄기" : "켜기"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      if (!confirm("이 학습 자료를 삭제할까요?")) return;
                      const fd = new FormData();
                      fd.set("id", m.id);
                      const r = await deleteKnowledgeMaterialAction(fd);
                      if (r.error) toast.error(r.error);
                      else toast.success("삭제했습니다.");
                    })
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
