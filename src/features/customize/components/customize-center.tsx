"use client";

import { useState } from "react";
import { Bot, FileCheck2, Palette, Share2 } from "lucide-react";

import { cn } from "@/lib/utils";
import type { CustomizeTab } from "@/features/customize/types";
import { DesignTab } from "./design-tab";
import { AiLearningTab } from "./ai-learning-tab";
import { ApprovalCustomizeTab } from "./approval-customize-tab";
import { IntegrationTab } from "./integration-tab";
import type { getCustomizePageData } from "@/features/customize/queries";

const TABS: { id: CustomizeTab; label: string; icon: typeof Palette }[] = [
  { id: "design", label: "화면 디자인", icon: Palette },
  { id: "ai", label: "AI 학습", icon: Bot },
  { id: "approval", label: "전자결재", icon: FileCheck2 },
  { id: "integration", label: "SNS 연동", icon: Share2 },
];

export function CustomizeCenter({
  data,
}: {
  data: Awaited<ReturnType<typeof getCustomizePageData>>;
}) {
  const [tab, setTab] = useState<CustomizeTab>("design");

  return (
    <div className="space-y-6">
      <nav
        className="flex flex-wrap gap-1 rounded-lg border bg-muted/30 p-1"
        aria-label="커스터마이징 탭"
      >
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                tab === t.id
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </nav>

      {tab === "design" && (
        <DesignTab settings={data.settings} layout={data.layout} />
      )}
      {tab === "ai" && (
        <AiLearningTab jobs={data.ingestJobs} boards={data.boards} />
      )}
      {tab === "approval" && (
        <ApprovalCustomizeTab
          templates={data.templates}
          lineTemplates={data.lineTemplates}
          users={data.users}
        />
      )}
      {tab === "integration" && (
        <IntegrationTab integrations={data.integrations} />
      )}
    </div>
  );
}
