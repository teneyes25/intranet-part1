"use client";

import { useState } from "react";
import { Activity, ClipboardCheck, FlaskConical, Users } from "lucide-react";

import { cn } from "@/lib/utils";
import type { PilotAdminTab } from "@/features/pilot/types";
import type { getPilotAdminPageData } from "@/features/pilot/queries";
import { PilotSettingsTab } from "./pilot-settings-tab";
import { PilotGroupsTab } from "./pilot-groups-tab";
import { PilotMonitoringTab } from "./pilot-monitoring-tab";
import { PilotChecklistTab } from "./pilot-checklist-tab";

const TABS: { id: PilotAdminTab; label: string; icon: typeof FlaskConical }[] = [
  { id: "settings", label: "Pilot 설정", icon: FlaskConical },
  { id: "groups", label: "그룹 관리", icon: Users },
  { id: "monitoring", label: "모니터링", icon: Activity },
  { id: "checklist", label: "배포 체크리스트", icon: ClipboardCheck },
];

export function PilotAdminCenter({
  data,
}: {
  data: Awaited<ReturnType<typeof getPilotAdminPageData>>;
}) {
  const [tab, setTab] = useState<PilotAdminTab>("settings");

  return (
    <div className="space-y-6">
      <nav
        className="flex flex-wrap gap-1 rounded-lg border bg-muted/30 p-1"
        aria-label="Pilot 관리 탭"
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

      {tab === "settings" && (
        <PilotSettingsTab settings={data.monitoring.settings} envActive={data.monitoring.pilotModeEnv} />
      )}
      {tab === "groups" && <PilotGroupsTab groups={data.groups} users={data.users} />}
      {tab === "monitoring" && <PilotMonitoringTab data={data.monitoring} />}
      {tab === "checklist" && <PilotChecklistTab />}
    </div>
  );
}
