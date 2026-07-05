"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, Home, Megaphone, Menu, ShoppingBag } from "lucide-react";

import { cn } from "@/lib/utils";

interface MobileBottomNavProps {
  onMenuClick: () => void;
}

const TABS = [
  { href: "/dashboard", label: "홈", icon: Home, match: (p: string) => p === "/dashboard" },
  {
    href: "/boards/notices",
    label: "공지",
    icon: Megaphone,
    match: (p: string) => p.startsWith("/boards/notices"),
  },
  {
    href: "/boards/anabada",
    label: "장터",
    icon: ShoppingBag,
    match: (p: string) => p.startsWith("/boards/anabada"),
  },
  { href: "/ai-agent", label: "AI", icon: Bot, match: (p: string) => p.startsWith("/ai-agent") },
] as const;

export function MobileBottomNav({ onMenuClick }: MobileBottomNavProps) {
  const pathname = usePathname();

  return (
    <nav
      className="app-mobile-nav fixed inset-x-0 bottom-0 z-40 md:hidden"
      aria-label="하단 빠른 메뉴"
    >
      <div className="flex items-stretch justify-around px-1 pb-[env(safe-area-inset-bottom,0px)]">
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "app-mobile-nav-item flex flex-1 flex-col items-center gap-0.5 py-2",
                active && "app-mobile-nav-item-active",
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="h-5 w-5" aria-hidden />
              <span className="text-[10px] font-semibold">{tab.label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={onMenuClick}
          className="app-mobile-nav-item flex flex-1 flex-col items-center gap-0.5 py-2"
          aria-label="전체 메뉴 열기"
        >
          <Menu className="h-5 w-5" aria-hidden />
          <span className="text-[10px] font-semibold">메뉴</span>
        </button>
      </div>
    </nav>
  );
}
