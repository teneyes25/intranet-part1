"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Bot,
  Send,
  Sparkles,
  User,
  Loader2,
  RefreshCw,
  ExternalLink,
  Paperclip,
} from "lucide-react";
import { toast } from "sonner";

import { MarkdownContent } from "@/components/markdown-content";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Source {
  title: string | null;
  url: string | null;
  score: number;
  snippet: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  mode?: "generative" | "extractive";
  intent?: string;
}

const SUGGESTIONS = [
  "최신 뉴스 요약해줘",
  "행정안전부 정책 기반으로 휴가 기안서 작성해줘",
  "유사 사례 찾아서 제안해",
  "공지사항 핵심 내용 알려줘",
];

export function AiChat({ canSync = false }: { canSync?: boolean }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [attachment, setAttachment] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, loading]);

  async function send(question: string) {
    const q = question.trim();
    if (!q || loading) return;

    const fullQuestion = attachment ? `${q}\n\n[첨부 참고]\n${attachment}` : q;
    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, { role: "user", content: fullQuestion }]);
    setInput("");
    setAttachment(null);
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: fullQuestion, history, conversationId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "요청 실패");
      if (data.conversationId) setConversationId(data.conversationId);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.answer,
          sources: data.sources,
          mode: data.mode,
          intent: data.intent,
        },
      ]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI 요청 실패");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: e instanceof Error ? `오류: ${e.message}` : "알 수 없는 오류",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function runSync() {
    if (syncing) return;
    setSyncing(true);
    setSyncMsg(null);
    try {
      const res = await fetch("/api/ai/ingest", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "동기화 실패");
      setSyncMsg(`동기화 완료: 게시글 ${data.ingested}건 / 청크 ${data.chunks}개`);
      toast.success("지식 동기화 완료");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "동기화 실패";
      setSyncMsg(msg);
      toast.error(msg);
    } finally {
      setSyncing(false);
    }
  }

  function onFileSelect(file: File | undefined) {
    if (!file) return;
    if (file.size > 50_000) {
      toast.error("텍스트 파일 50KB 이하만 첨부 가능합니다.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setAttachment(String(reader.result).slice(0, 4000));
      toast.success(`「${file.name}」 첨부됨`);
    };
    reader.readAsText(file);
  }

  return (
    <div className="flex h-[calc(100vh-13rem)] flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-card">
      <div className="flex items-center justify-between border-b border-border/60 bg-gradient-to-r from-primary/5 to-transparent px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-soft">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">인트라넷 AI 어시스턴트</p>
            <p className="text-xs text-muted-foreground">
              Hybrid RAG · 대화 메모리 · 마크다운
            </p>
          </div>
        </div>
        {canSync && (
          <Button variant="outline" size="sm" onClick={runSync} disabled={syncing}>
            {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            지식 동기화
          </Button>
        )}
      </div>

      {syncMsg && (
        <div className="border-b bg-muted/40 px-4 py-2 text-xs text-muted-foreground">{syncMsg}</div>
      )}

      <div
        ref={scrollRef}
        className="flex-1 space-y-4 overflow-y-auto p-4"
        role="log"
        aria-live="polite"
        aria-label="AI 대화"
      >
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center animate-in fade-in duration-500">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <p className="mb-1 font-medium">무엇이든 물어보세요</p>
            <p className="mb-4 max-w-sm text-sm text-muted-foreground">
              사내 자료 검색, 뉴스 요약, 유사 사례 제안, 기안서 작성 가이드를 지원합니다.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="rounded-full border border-border/60 bg-background px-3.5 py-2 text-xs font-medium shadow-soft transition-all duration-200 hover:border-primary/40 hover:bg-primary/5 hover:shadow-card"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, idx) => (
          <div
            key={idx}
            className={cn("flex gap-3 animate-in slide-in-from-bottom-2 duration-300", m.role === "user" ? "flex-row-reverse" : "flex-row")}
          >
            <div
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted",
              )}
            >
              {m.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
            </div>
            <div className={cn("max-w-[85%] space-y-2", m.role === "user" ? "text-right" : "text-left")}>
              <div
                className={cn(
                  "rounded-2xl px-4 py-2.5 text-sm",
                  m.role === "user" ? "bg-primary text-primary-foreground whitespace-pre-wrap" : "bg-muted",
                )}
              >
                {m.role === "assistant" ? (
                  <MarkdownContent content={m.content} />
                ) : (
                  m.content
                )}
              </div>

              {m.role === "assistant" && m.mode && (
                <div className="flex flex-wrap gap-1">
                  <Badge variant="secondary" className="text-[10px]">
                    {m.mode === "generative" ? "생성형" : "추출형"}
                  </Badge>
                  {m.intent && (
                    <Badge variant="outline" className="text-[10px]">
                      {m.intent}
                    </Badge>
                  )}
                </div>
              )}

              {m.sources && m.sources.length > 0 && (
                <div className="space-y-1 text-left">
                  <p className="text-xs font-medium text-muted-foreground">참고 자료 (출처)</p>
                  {m.sources.map((s, i) => (
                    <div key={i} className="rounded-lg border bg-background p-2 text-xs transition-colors hover:bg-muted/50">
                      {s.url ? (
                        <Link href={s.url} className="flex items-center gap-1 font-medium text-primary hover:underline">
                          [{i + 1}] {s.title ?? "자료"}
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      ) : (
                        <span className="font-medium">[{i + 1}] {s.title ?? "자료"}</span>
                      )}
                      <p className="mt-0.5 line-clamp-2 text-muted-foreground">{s.snippet}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
              <Bot className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-2 rounded-2xl bg-muted px-4 py-2.5 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Hybrid 검색 및 답변 생성 중…
            </div>
          </div>
        )}
      </div>

      {attachment && (
        <div className="border-t bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          📎 첨부: {attachment.slice(0, 80)}…
          <button type="button" className="ml-2 text-primary" onClick={() => setAttachment(null)}>
            제거
          </button>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex items-center gap-2 border-t p-3"
      >
        <input
          ref={fileRef}
          type="file"
          accept=".txt,.md,.csv"
          className="hidden"
          onChange={(e) => onFileSelect(e.target.files?.[0])}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="파일 첨부"
          onClick={() => fileRef.current?.click()}
        >
          <Paperclip className="h-4 w-4" />
        </Button>
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="질문을 입력하세요…"
          disabled={loading}
          aria-label="AI 질문 입력"
        />
        <Button type="submit" disabled={loading || !input.trim()} aria-label="전송">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
