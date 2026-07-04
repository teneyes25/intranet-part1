"use client";

import { BookOpen, BookOpenCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PostReadModeToggleProps {
  children: React.ReactNode;
  className?: string;
}

/** 모바일에서 본문 가독성을 높이는 읽기 모드 토글 */
export function PostReadModeToggle({ children, className }: PostReadModeToggleProps) {
  return (
    <div className={cn("relative", className)}>
      <div className="mb-3 flex justify-end lg:hidden">
        <ReadModeButton targetId="post-body-content" />
      </div>
      <div id="post-body-content">{children}</div>
    </div>
  );
}

function ReadModeButton({ targetId }: { targetId: string }) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="min-h-9"
      onClick={() => {
        const el = document.getElementById(targetId);
        if (!el) return;
        const on = el.classList.toggle("post-read-mode");
        el.setAttribute("data-read-mode", on ? "true" : "false");
      }}
    >
      <BookOpen className="h-4 w-4 sm:mr-1" />
      <span className="hidden sm:inline">읽기 모드</span>
    </Button>
  );
}

export function PostReadModeIndicator() {
  return (
    <p className="post-read-mode-hint hidden items-center gap-1 text-xs text-primary lg:hidden">
      <BookOpenCheck className="h-3.5 w-3.5" />
      읽기 모드
    </p>
  );
}
