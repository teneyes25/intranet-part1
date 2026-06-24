"use client";

import Link from "next/link";
import { FlaskConical, MessageSquarePlus, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { PilotBannerConfig } from "@/features/pilot/types";

export function PilotBanner({ config }: { config: PilotBannerConfig }) {
  const [dismissed, setDismissed] = useState(false);

  if (!config.show || dismissed) return null;

  return (
    <div className="mb-4 flex flex-wrap items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
      <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-amber-900 dark:text-amber-100">{config.title}</p>
        <p className="mt-0.5 text-amber-800/90 dark:text-amber-200/90">{config.message}</p>
        {config.feedbackEnabled && (
          <Button asChild size="sm" variant="outline" className="mt-2 h-8">
            <Link href="/feedback">
              <MessageSquarePlus className="h-3.5 w-3.5" />
              Pilot 피드백 남기기
            </Link>
          </Button>
        )}
      </div>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-8 w-8 shrink-0"
        onClick={() => setDismissed(true)}
        aria-label="배너 닫기"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
