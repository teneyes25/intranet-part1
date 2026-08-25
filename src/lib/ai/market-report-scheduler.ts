import "server-only";

import cron from "node-cron";

import { prisma } from "@/lib/prisma";
import { generateMonthlyMarketReport } from "@/lib/ai/market-report";

const PROVIDER_KEY = "market_report_monthly";

const g = globalThis as unknown as {
  marketReportCronStarted?: boolean;
  marketReportInFlight?: Promise<void> | null;
};

function kstYearMonthKey(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
  }).format(now);
}

async function claimMonthlySlot(ym: string): Promise<boolean> {
  const existing = await prisma.integrationSetting.findUnique({
    where: { provider: PROVIDER_KEY },
  });
  const lastYm =
    existing?.metadata &&
    typeof existing.metadata === "object" &&
    !Array.isArray(existing.metadata) &&
    typeof (existing.metadata as { lastYm?: unknown }).lastYm === "string"
      ? (existing.metadata as { lastYm: string }).lastYm
      : null;

  if (lastYm === ym) return false;

  await prisma.integrationSetting.upsert({
    where: { provider: PROVIDER_KEY },
    create: {
      provider: PROVIDER_KEY,
      displayName: "매종이 월간 시장조사",
      isEnabled: true,
      metadata: { lastYm: ym },
    },
    update: {
      isEnabled: true,
      displayName: "매종이 월간 시장조사",
      metadata: { lastYm: ym },
    },
  });
  return true;
}

async function releaseMonthlySlot(ym: string): Promise<void> {
  const existing = await prisma.integrationSetting.findUnique({
    where: { provider: PROVIDER_KEY },
  });
  if (!existing) return;
  const lastYm =
    existing?.metadata &&
    typeof existing.metadata === "object" &&
    !Array.isArray(existing.metadata) &&
    typeof (existing.metadata as { lastYm?: unknown }).lastYm === "string"
      ? (existing.metadata as { lastYm: string }).lastYm
      : null;
  if (lastYm !== ym) return;
  await prisma.integrationSetting.update({
    where: { provider: PROVIDER_KEY },
    data: {
      metadata: { lastYm: null, lastFailedAt: new Date().toISOString() },
    },
  });
}

/** 매월 1일 09:10 KST — 시장조사 보고서 */
export function startMarketReportCron() {
  if (g.marketReportCronStarted) return;
  g.marketReportCronStarted = true;

  cron.schedule(
    "10 9 1 * *",
    () => {
      if (g.marketReportInFlight) return;
      g.marketReportInFlight = (async () => {
        const ym = kstYearMonthKey();
        let claimed = false;
        try {
          claimed = await claimMonthlySlot(ym);
          if (!claimed) {
            console.log(`[market-report] ${ym} 이미 작성됨 — 스킵`);
            return;
          }
          const result = await generateMonthlyMarketReport("cron");
          console.log("[market-report] cron done:", result);
        } catch (e) {
          console.error("[market-report] cron failed:", e);
          if (claimed) {
            try {
              await releaseMonthlySlot(ym);
            } catch {
              /* ignore */
            }
          }
        } finally {
          g.marketReportInFlight = null;
        }
      })();
    },
    { timezone: "Asia/Seoul" },
  );
  console.log("[market-report] monthly cron registered (09:10 Asia/Seoul, day 1)");
}
