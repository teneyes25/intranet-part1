"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { GripVertical, Loader2, Send, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AI_AGENT_AVATAR,
  AI_AGENT_NAME,
  GREETING_MESSAGE,
} from "@/lib/ai/persona-public";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "assistant"; content: string };

const POS_KEY = "intranet:maejongi-pos";
const HIDE_KEY = "intranet:maejongi-hidden";

/**
 * 홈/전역 메종이 위젯 — 드래그 이동, 숨김, 오버레이 없이 채팅(다른 기능 사용 가능)
 */
export function MaejongiHomeBanner({
  floating = true,
}: {
  floating?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [pos, setPos] = useState({ x: 16, y: 16 });
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [pending, start] = useTransition();
  const [conversationId, setConversationId] = useState<string | undefined>();
  const bottomRef = useRef<HTMLDivElement>(null);
  const greeted = useRef(false);
  const drag = useRef<{ dx: number; dy: number } | null>(null);

  useEffect(() => {
    try {
      if (localStorage.getItem(HIDE_KEY) === "1") setHidden(true);
      const p = localStorage.getItem(POS_KEY);
      if (p) setPos(JSON.parse(p) as { x: number; y: number });
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (open && !greeted.current) {
      greeted.current = true;
      setMessages([{ role: "assistant", content: GREETING_MESSAGE }]);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest("button,a,input,textarea")) return;
      drag.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [pos],
  );
  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!drag.current) return;
    setPos({
      x: Math.min(window.innerWidth - 80, Math.max(8, e.clientX - drag.current.dx)),
      y: Math.min(window.innerHeight - 80, Math.max(8, e.clientY - drag.current.dy)),
    });
  }, []);
  const onPointerUp = useCallback(() => {
    if (!drag.current) return;
    drag.current = null;
    setPos((p) => {
      try {
        localStorage.setItem(POS_KEY, JSON.stringify(p));
      } catch {
        /* ignore */
      }
      return p;
    });
  }, []);

  function hide() {
    setHidden(true);
    setOpen(false);
    try {
      localStorage.setItem(HIDE_KEY, "1");
    } catch {
      /* ignore */
    }
  }

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
                "잠시 후 다시 시도해 주세요.",
            },
          ]);
          return;
        }
        if (data.conversationId) setConversationId(data.conversationId);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: (data.answer as string) || "답변을 만들지 못했어요.",
          },
        ]);
      } catch {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "연결에 문제가 있어요." },
        ]);
      }
    });
  }

  if (!floating) return null;

  if (hidden) {
    return (
      <button
        type="button"
        className="fixed bottom-4 right-4 z-40 rounded-full border bg-white px-3 py-1.5 text-xs shadow"
        onClick={() => {
          setHidden(false);
          try {
            localStorage.removeItem(HIDE_KEY);
          } catch {
            /* ignore */
          }
        }}
      >
        {AI_AGENT_NAME} 표시
      </button>
    );
  }

  return (
    <div
      className="fixed z-40 w-max"
      style={{ left: pos.x, top: pos.y }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {!open ? (
        <div className="flex cursor-grab items-center gap-2 rounded-2xl border border-[#D5DCD6] bg-white px-3 py-2 shadow-md active:cursor-grabbing">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex items-center gap-3 text-left"
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
              />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold">{AI_AGENT_NAME}에게 물어보기</span>
              <span className="block text-xs text-muted-foreground">드래그로 이동 · X로 숨김</span>
            </span>
          </button>
          <button
            type="button"
            className="rounded p-1 text-muted-foreground hover:bg-muted"
            aria-label="숨기기"
            onClick={hide}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="flex h-[min(520px,70vh)] w-[min(380px,92vw)] flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl">
          <div className="flex cursor-grab items-center gap-2 border-b bg-[#F7F8F6] px-3 py-2 active:cursor-grabbing">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
            <span className="relative h-8 w-8 overflow-hidden rounded-full bg-[#EEF1ED]">
              <Image
                src={AI_AGENT_AVATAR}
                alt=""
                width={32}
                height={32}
                className="h-full w-full object-cover"
                unoptimized
              />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{AI_AGENT_NAME}</p>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link href="/ai-agent">전체</Link>
            </Button>
            <Button type="button" size="icon" variant="ghost" onClick={() => setOpen(false)} title="최소화">
              <X className="h-4 w-4" />
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={hide} title="홈에서 숨기기">
              숨김
            </Button>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto px-3 py-2">
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  "max-w-[90%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap",
                  m.role === "assistant"
                    ? "bg-[#EEF1ED]"
                    : "ml-auto bg-primary text-primary-foreground",
                )}
              >
                {m.content}
              </div>
            ))}
            {pending && (
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                답변 준비 중…
              </p>
            )}
            <div ref={bottomRef} />
          </div>
          <form
            className="flex gap-2 border-t p-2"
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
      )}
    </div>
  );
}
