"use client";

import { useEffect, useState } from "react";
import { MessageSquare, X } from "lucide-react";

import {
  pingMessengerPresenceAction,
  refreshMessengerStateAction,
} from "@/features/messenger/actions";
import { openMessengerPopup } from "@/features/messenger/open-popup";

const HIDE_KEY = "intranet:messenger-hidden";

export function MessengerHomeWidget() {
  const [hidden, setHidden] = useState(false);
  const [online, setOnline] = useState(0);

  useEffect(() => {
    try {
      if (localStorage.getItem(HIDE_KEY) === "1") setHidden(true);
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

  useEffect(() => {
    let cancelled = false;
    async function pull() {
      const r = await refreshMessengerStateAction();
      if (cancelled || !("ok" in r) || !r.ok) return;
      setOnline(r.directory.filter((d) => d.online).length);
    }
    void pull();
    const t = setInterval(() => void pull(), 15000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  function hide() {
    setHidden(true);
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
        className="fixed bottom-16 right-4 z-40 rounded-full border bg-white px-3 py-1.5 text-xs shadow"
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
    <div className="fixed bottom-20 right-4 z-40 flex w-[168px] flex-col overflow-hidden rounded-2xl border bg-white shadow-lg">
      <div className="flex items-center gap-1 border-b bg-[#F7F8F6] px-2 py-1">
        <p className="flex-1 text-xs font-semibold">사내 메신저</p>
        <button
          type="button"
          className="rounded p-0.5 text-muted-foreground hover:bg-muted"
          aria-label="메신저 숨기기"
          onClick={hide}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <button
        type="button"
        onClick={() => openMessengerPopup()}
        className="flex items-center gap-2 px-2.5 py-2 text-left hover:bg-[#F7F8F6]"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#E6EAE6]">
          <MessageSquare className="h-4 w-4 text-[#5C7358]" />
        </span>
        <span className="min-w-0">
          <span className="block text-xs font-medium">새 창으로 대화</span>
          <span className="block text-[10px] text-muted-foreground">
            로그인 {online}명 · 카카오톡처럼
          </span>
        </span>
      </button>
    </div>
  );
}
