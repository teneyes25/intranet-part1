"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";

export function MailboxSearch({ boardKey }: { boardKey: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";

  return (
    <form
      className="relative"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const query = String(fd.get("q") ?? "").trim();
        const params = new URLSearchParams(searchParams.toString());
        if (query) params.set("q", query);
        else params.delete("q");
        params.delete("page");
        router.push(`/boards/${boardKey}/mailbox?${params.toString()}`);
      }}
    >
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        name="q"
        defaultValue={q}
        placeholder="메일함에서 검색…"
        className="h-10 border-slate-custom-200 bg-white pl-9 shadow-soft"
      />
    </form>
  );
}
