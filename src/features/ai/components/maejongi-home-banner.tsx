"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { Loader2, MessageCircle, Send, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AI_AGENT_AVATAR,
  AI_AGENT_NAME,
  GREETING_MESSAGE,
} from "@/lib/ai/persona-public";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "assistant"; content: string };

/**
 * 전역 플로팅 매종이 배너 (우측 하단 고정).
 * AppShell에 마운트해 홈 외 화면에서도 항상 보이게 합니다.
 */
export function MaejongiHomeBanner({
  floating = true,
}: {
  floating?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [pending, start] = useTransition();
  const [conversationId, setConversationId] = useState<string | undefined>();
  const bottomRef = useRef<HTMLDivElement>(null);
  const greeted = useRef(false);

  useEffect(() => {
    if (open && !greeted.current) {
      greeted.current = true;
      setMessages([{ role: "assistant", content: GREETING_MESSAGE }]);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  function send(text: string) {
    const q = text.trim();
    if (!q || pending) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: q }]);
    start(async () => {
      try {
        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: q,
            conversationId,
            history: messages.slice(-6),
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content:
                (typeof data.error === "string" && data.error) ||
                "잠시 후 다시 시도해 주세요. LLM·지식 동기화 설정을 관리자에게 확인해 주세요.",
            },
          ]);
          return;
        }
        if (data.conversationId) setConversationId(data.conversationId);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              (data.answer as string) ||
              "답변을 만들지 못했어요. 다시 한 번 물어봐 주세요.",
          },
        ]);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "연결에 문제가 있어요. 네트워크 후 다시 시도해 주세요.",
          },
        ]);
      }
    });
  }

  const trigger = (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className={cn(
        "group flex items-center gap-3 rounded-2xl border border-[#D5DCD6] bg-white px-3 py-2 text-left shadow-md transition",
        "hover:-translate-y-0.5 hover:shadow-lg",
        floating && "max-w-[280px]",
      )}
      aria-label={`${AI_AGENT_NAME}에게 물어보기`}
    >
      <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-[#EEF1ED] ring-2 ring-[#C5CFC6]">
        <Image
          src={AI_AGENT_AVATAR}
          alt={AI_AGENT_NAME}
          width={48}
          height={48}
          className="h-full w-full object-cover"
          unoptimized
          priority
        />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-[#1C1F1D]">
          {AI_AGENT_NAME}에게 물어보기
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          업무·기안·시장 조언을 도와드려요
        </span>
      </span>
      {floating && (
        <MessageCircle className="h-4 w-4 shrink-0 text-[#5C7358] opacity-70 group-hover:opacity-100" />
      )}
    </button>
  );

  return (
    <>
      {floating ? (
        <div className="pointer-events-none fixed bottom-4 right-4 z-40 sm:bottom-6 sm:right-6">
          <div className="pointer-events-auto">{trigger}</div>
        </div>
      ) : (
        trigger
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-end p-3 sm:items-end sm:p-6">
          <button
            type="button"
            className="absolute inset-0 bg-black/30"
            aria-label="닫기"
            onClick={() => setOpen(false)}
          />
          <div className="relative z-10 flex h-[min(640px,85vh)] w-full max-w-md flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl">
            <div className="flex items-center gap-3 border-b bg-[#F7F8F6] px-4 py-3">
              <span className="relative h-10 w-10 overflow-hidden rounded-full bg-[#EEF1ED]">
                <Image
                  src={AI_AGENT_AVATAR}
                  alt={AI_AGENT_NAME}
                  width={40}
                  height={40}
                  className="h-full w-full object-cover"
                  unoptimized
                />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{AI_AGENT_NAME}</p>
                <p className="text-xs text-muted-foreground">프렌치메종 신입사원</p>
              </div>
              <Button asChild size="sm" variant="outline">
                <Link href="/ai-agent">전체 화면</Link>
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => setOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={cn(
                    "max-w-[90%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap",
                    m.role === "assistant"
                      ? "bg-[#EEF1ED] text-foreground"
                      : "ml-auto bg-primary text-primary-foreground",
                  )}
                >
                  {m.content}
                </div>
              ))}
              {pending && (
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {AI_AGENT_NAME}가 답변을 준비 중…
                </p>
              )}
              <div ref={bottomRef} />
            </div>

            <form
              className="flex gap-2 border-t p-3"
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="무엇을 도와드릴까요?"
                disabled={pending}
              />
              <Button type="submit" disabled={pending || !input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
