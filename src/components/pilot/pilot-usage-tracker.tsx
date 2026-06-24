"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function PilotUsageTracker({ enabled }: { enabled: boolean }) {
  const pathname = usePathname();

  useEffect(() => {
    if (!enabled || !pathname) return;
    void fetch("/api/pilot/metrics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: "page_view", resource: pathname }),
    }).catch(() => {});
  }, [enabled, pathname]);

  return null;
}
