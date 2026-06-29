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
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border/60 bg-background/80 px-4 shadow-soft backdrop-blur-md supports-[backdrop-filter]:bg-background/70 md:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={onMenuClick}
        aria-label="메뉴 열기"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <TopbarSearch />

      <div className="ml-auto flex items-center gap-1">
        <NotificationBell />

        <ThemeToggle />

        <div className="mx-1 hidden h-6 w-px bg-border sm:block" />

        <UserMenu name={user.name} email={user.email} role={user.role} />
      </div>
    </header>
  );
}
