"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  Plus,
  MessageSquare,
  Trash2,
  PanelLeft,
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
  id?: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  mode?: "generative" | "extractive";
  intent?: string;
}

interface ConversationItem {
  id: string;
  title: string;
  updatedAt: string;
  messageCount: number;
}

const SUGGESTIONS = [
  "안녕 메종이야? 자기소개 해줘",
  "오늘 서울 날씨 어때?",
  "오늘 정치·시사 주요 뉴스 요약해줘",
  "내 업무에 맞춰 오늘 할 일 조언해줘",
  "최신 뉴스 요약해줘",
  "침구·매트리스 시장 동향 알려줘",
  "전자결재 기안문 초안 도와줘",
];

function formatWhen(iso: string) {
  try {
    return new Intl.DateTimeFormat("ko-KR", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

export function AiChat({
  canSync = false,
  initialConversations = [],
}: {
  canSync?: boolean;
  initialConversations?: ConversationItem[];
}) {
  const [conversations, setConversations] =
    useState<ConversationItem[]>(initialConversations);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [attachment, setAttachment] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loadingConv, setLoadingConv] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, loading]);

  const refreshConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/ai/conversations");
      const data = await res.json();
      if (res.ok && Array.isArray(data.conversations)) {
        setConversations(data.conversations);
      }
    } catch {
      /* ignore */
    }
  }, []);

  async function startNewChat() {
    setConversationId(undefined);
    setMessages([]);
    setAttachment(null);
    try {
      const res = await fetch("/api/ai/conversations", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.conversation?.id) {
        setConversationId(data.conversation.id);
        await refreshConversations();
      }
    } catch {
      /* 전송 시 자동 생성 */
    }
  }

  async function openConversation(id: string) {
    if (loadingConv || id === conversationId) return;
    setLoadingConv(true);
    try {
      const res = await fetch(`/api/ai/conversations/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "불러오기 실패");
      setConversationId(id);
      setMessages(
        (data.messages ?? []).map(
          (m: {
            id: string;
            role: "user" | "assistant";
            content: string;
            sources?: Source[];
          }) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            sources: Array.isArray(m.sources) ? m.sources : undefined,
          }),
        ),
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "대화 불러오기 실패");
    } finally {
      setLoadingConv(false);
    }
  }

  async function removeConversation(id: string) {
    if (!window.confirm("이 대화를 삭제할까요?")) return;
    try {
      const res = await fetch(`/api/ai/conversations/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("삭제 실패");
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (conversationId === id) {
        setConversationId(undefined);
        setMessages([]);
      }
      toast.success("대화를 삭제했습니다");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "삭제 실패");
    }
  }

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
        body: JSON.stringify({
          question: fullQuestion,
          history,
          conversationId,
        }),
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
      void refreshConversations();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI 요청 실패");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            e instanceof Error
              ? `죄송해요, 오류가 났어요: ${e.message}`
              : "알 수 없는 오류예요.",
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
      const posts = data.postsProcessed ?? data.ingested ?? 0;
      const docs = data.documentsProcessed ?? 0;
      const apr = data.approvalsProcessed ?? 0;
      const chunks = data.chunksTotal ?? data.chunks ?? 0;
      setSyncMsg(
        `동기화 완료: 게시글 ${posts} · 문서 ${docs} · 결재 ${apr} / 청크 ${chunks}`,
      );
      toast.success("메종이 지식 동기화 완료");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "동기화 실패";
      setSyncMsg(msg);
      toast.error(msg);
    } finally {
      setSyncing(false);
    }
  }

  async function runMarketReport() {
    if (reportLoading) return;
    setReportLoading(true);
    try {
      const res = await fetch("/api/ai/market-report", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "보고서 생성 실패");
      toast.success(data.title ? `게시됨: ${data.title}` : "시장조사 보고서 생성 완료");
      if (data.postId) {
        await send(`방금 작성한 시장조사 보고서(게시글 ID ${data.postId}) 핵심을 요약해줘`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "보고서 생성 실패");
    } finally {
      setReportLoading(false);
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
    <div className="flex h-[calc(100vh-11rem)] overflow-hidden rounded-2xl border border-border/60 bg-card shadow-card">
      {/* 대화 목록 */}
      <aside
        className={cn(
          "flex w-64 shrink-0 flex-col border-r border-border/60 bg-muted/20 transition-[width]",
          !sidebarOpen && "hidden md:flex md:w-0 md:overflow-hidden md:border-0",
          sidebarOpen ? "flex" : "hidden",
        )}
      >
        <div className="flex items-center gap-2 border-b border-border/60 p-3">
          <Button
            type="button"
            size="sm"
            className="flex-1"
            onClick={() => void startNewChat()}
          >
            <Plus className="h-4 w-4" />
            새 대화
          </Button>
        </div>
        <div className="flex-1 space-y-0.5 overflow-y-auto p-2">
          {conversations.length === 0 && (
            <p className="px-2 py-4 text-center text-xs text-muted-foreground">
              아직 대화가 없어요.
              <br />
              7일 지나면 자동 삭제돼요.
            </p>
          )}
          {conversations.map((c) => (
            <div
              key={c.id}
              className={cn(
                "group flex items-start gap-1 rounded-lg px-2 py-2 text-left text-sm transition-colors hover:bg-muted/80",
                conversationId === c.id && "bg-muted",
              )}
            >
              <button
                type="button"
                className="min-w-0 flex-1 text-left"
                onClick={() => void openConversation(c.id)}
              >
                <span className="flex items-center gap-1.5 truncate font-medium">
                  <MessageSquare className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">{c.title || "새 대화"}</span>
                </span>
                <span className="mt-0.5 block text-[10px] text-muted-foreground">
                  {formatWhen(c.updatedAt)} · {c.messageCount}메시지
                </span>
              </button>
              <button
                type="button"
                className="rounded p-1 text-muted-foreground opacity-0 hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                aria-label="대화 삭제"
                onClick={() => void removeConversation(c.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
        <p className="border-t border-border/60 px-3 py-2 text-[10px] text-muted-foreground">
          대화는 개인별로 저장되며 7일 후 삭제됩니다.
        </p>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between gap-2 border-b border-border/60 bg-gradient-to-r from-amber-50/80 via-transparent to-transparent px-4 py-3 dark:from-amber-950/20">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="shrink-0"
              aria-label="대화 목록"
              onClick={() => setSidebarOpen((v) => !v)}
            >
              <PanelLeft className="h-4 w-4" />
            </Button>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-600 text-white shadow-soft">
              <Bot className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">
                메종이
                <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                  프렌치메종 신입사원
                </span>
              </p>
              <p className="truncate text-xs text-muted-foreground">
                시장조사 · 뉴스 · 기안 조언 · 사내 자료
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap justify-end gap-1">
            {canSync && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void runMarketReport()}
                  disabled={reportLoading}
                >
                  {reportLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  시장조사
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void runSync()}
                  disabled={syncing}
                >
                  {syncing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  지식 동기화
                </Button>
              </>
            )}
          </div>
        </div>

        {syncMsg && (
          <div className="border-b bg-muted/40 px-4 py-2 text-xs text-muted-foreground">
            {syncMsg}
          </div>
        )}

        <div
          ref={scrollRef}
          className="flex-1 space-y-4 overflow-y-auto p-4"
          role="log"
          aria-live="polite"
          aria-label="메종이 대화"
        >
          {loadingConv && (
            <div className="flex justify-center py-8 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              대화 불러오는 중…
            </div>
          )}

          {!loadingConv && messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center text-center animate-in fade-in duration-500">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                <Sparkles className="h-7 w-7" />
              </div>
              <p className="mb-1 text-lg font-semibold">안녕하세요, 메종이에요!</p>
              <p className="mb-4 max-w-md text-sm text-muted-foreground">
                프렌치메종 신입사원으로서 시장조사, 뉴스 요약, 기안서 조언,
                사내 자료 찾기를 도와드릴게요. 무엇이든 물어보세요.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => void send(s)}
                    className="rounded-full border border-border/60 bg-background px-3.5 py-2 text-xs font-medium shadow-soft transition-all duration-200 hover:border-amber-500/40 hover:bg-amber-50 hover:shadow-card dark:hover:bg-amber-950/40"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, idx) => (
            <div
              key={m.id ?? idx}
              className={cn(
                "flex gap-3 animate-in slide-in-from-bottom-2 duration-300",
                m.role === "user" ? "flex-row-reverse" : "flex-row",
              )}
            >
              <div
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                  m.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-amber-600 text-white",
                )}
              >
                {m.role === "user" ? (
                  <User className="h-4 w-4" />
                ) : (
                  <Bot className="h-4 w-4" />
                )}
              </div>
              <div
                className={cn(
                  "max-w-[85%] space-y-2",
                  m.role === "user" ? "text-right" : "text-left",
                )}
              >
                {m.role === "assistant" && (
                  <p className="text-[11px] font-medium text-amber-800 dark:text-amber-200">
                    메종이
                  </p>
                )}
                <div
                  className={cn(
                    "rounded-2xl px-4 py-2.5 text-sm",
                    m.role === "user"
                      ? "whitespace-pre-wrap bg-primary text-primary-foreground"
                      : "bg-muted",
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
                    <p className="text-xs font-medium text-muted-foreground">
                      참고 자료
                    </p>
                    {m.sources.map((s, i) => (
                      <div
                        key={i}
                        className="rounded-lg border bg-background p-2 text-xs transition-colors hover:bg-muted/50"
                      >
                        {s.url ? (
                          <Link
                            href={s.url}
                            className="flex items-center gap-1 font-medium text-primary hover:underline"
                          >
                            [{i + 1}] {s.title ?? "자료"}
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        ) : (
                          <span className="font-medium">
                            [{i + 1}] {s.title ?? "자료"}
                          </span>
                        )}
                        <p className="mt-0.5 line-clamp-2 text-muted-foreground">
                          {s.snippet}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-600 text-white">
                <Bot className="h-4 w-4" />
              </div>
              <div className="flex items-center gap-2 rounded-2xl bg-muted px-4 py-2.5 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                메종이가 자료를 찾아보는 중…
              </div>
            </div>
          )}
        </div>

        {attachment && (
          <div className="border-t bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            📎 첨부: {attachment.slice(0, 80)}…
            <button
              type="button"
              className="ml-2 text-primary"
              onClick={() => setAttachment(null)}
            >
              제거
            </button>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
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
            placeholder="메종이에게 메시지 보내기…"
            disabled={loading}
            aria-label="메종이에게 질문"
          />
          <Button
            type="submit"
            disabled={loading || !input.trim()}
            aria-label="전송"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
