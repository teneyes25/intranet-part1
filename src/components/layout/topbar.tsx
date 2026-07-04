"use client";

import { Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/layout/notification-bell";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";
import { TopbarSearch } from "@/components/layout/topbar-search";
import type { Role } from "@/lib/auth/roles";

interface TopbarProps {
  user: {
    name: string;
    email: string;
    role: Role;
  };
  onMenuClick: () => void;
}

export function Topbar({ user, onMenuClick }: TopbarProps) {
  return (
    <header className="app-topbar">
      <Button
        variant="ghost"
        size="icon"
        className="touch-target shrink-0 md:hidden"
        onClick={onMenuClick}
        aria-label="메뉴 열기"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <TopbarSearch />

      <div className="ml-auto flex items-center gap-0.5 sm:gap-1">
        <NotificationBell />
        <ThemeToggle />
        <div className="mx-1 hidden h-6 w-px bg-border/80 sm:block" />
        <UserMenu name={user.name} email={user.email} role={user.role} />
      </div>
    </header>
  );
}
