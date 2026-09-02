"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GripVertical, MessageSquare, Minus, X } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { pingMessengerPresenceAction } from "@/features/messenger/actions";
import { MessengerApp, type DirectoryUser, type RoomSummary } from "./messenger-app";

const POS_KEY = "intranet:messenger-pos";
const HIDE_KEY = "intranet:messenger-hidden";

export function MessengerHomeWidget({
  meId,
  directory,
  rooms,
}: {
  meId: string;
  directory: DirectoryUser[];
  rooms: RoomSummary[];
}) {
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [pos, setPos] = useState({ x: 24, y: 88 });
  const drag = useRef<{ dx: number; dy: number } | null>(null);

  useEffect(() => {
    try {
      const h = localStorage.getItem(HIDE_KEY);
      if (h === "1") setHidden(true);
      const p = localStorage.getItem(POS_KEY);
      if (p) setPos(JSON.parse(p) as { x: number; y: number });
      else setPos({ x: Math.max(16, window.innerWidth - 240), y: 16 });
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      void pingMessengerPresenceAction();
    }, 25000);
    void pingMessengerPresenceAction();
    return () => clearInterval(t);
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button,a,input,textarea,label")) return;
    drag.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, [pos]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!drag.current) return;
    const next = {
      x: Math.min(window.innerWidth - 80, Math.max(8, e.clientX - drag.current.dx)),
      y: Math.min(window.innerHeight - 80, Math.max(8, e.clientY - drag.current.dy)),
    };
    setPos(next);
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

  if (hidden) {
    return (
      <button
        type="button"
        className="fixed bottom-4 left-4 z-40 rounded-full border bg-white px-3 py-1.5 text-xs shadow"
        onClick={() => {
          setHidden(false);
          try {
            localStorage.removeItem(HIDE_KEY);
          } catch {
            /* ignore */
          }
        }}
      >
        메신저 표시
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
        <div className="flex cursor-grab items-center gap-2 rounded-2xl border bg-white px-3 py-2 text-left shadow-md active:cursor-grabbing">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex items-center gap-2 text-left"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E6EAE6]">
              <MessageSquare className="h-5 w-5 text-[#5C7358]" />
            </span>
            <span>
              <span className="block text-sm font-semibold">사내 메신저</span>
              <span className="block text-xs text-muted-foreground">
                로그인 중 {directory.filter((d) => d.online).length}명 · 드래그로 이동
              </span>
            </span>
          </button>
          <button
            type="button"
            className="ml-1 rounded p-1 text-muted-foreground hover:bg-muted"
            aria-label="메신저 숨기기"
            onClick={(e) => {
              e.stopPropagation();
              hide();
            }}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <div className="flex h-[min(560px,75vh)] w-[min(420px,94vw)] flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl">
          <div className="flex cursor-grab items-center gap-2 border-b bg-[#F7F8F6] px-3 py-2 active:cursor-grabbing">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
            <MessageSquare className="h-4 w-4" />
            <p className="flex-1 text-sm font-semibold">사내 메신저</p>
            <Button asChild size="sm" variant="outline">
              <Link href="/messenger">전체</Link>
            </Button>
            <Button type="button" size="icon" variant="ghost" onClick={() => setOpen(false)} title="최소화">
              <Minus className="h-4 w-4" />
            </Button>
            <Button type="button" size="icon" variant="ghost" onClick={hide} title="홈에서 숨기기">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="min-h-0 flex-1">
            <MessengerApp meId={meId} directory={directory} rooms={rooms} compact />
          </div>
        </div>
      )}
    </div>
  );
}
