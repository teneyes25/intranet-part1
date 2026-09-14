import "server-only";

import cron from "node-cron";

import { prisma } from "@/lib/prisma";
import { NEWS_TIMEZONE } from "./config";
import { runNewsCollectionJob } from "./job";

const PROVIDER_KEY = "news_auto_collect";

const globalForNews = globalThis as unknown as {
  newsDailyCollectInFlight?: Promise<void> | null;
  newsWeekdayCronStarted?: boolean;
};

/** Asia/Seoul 기준 YYYY-MM-DD */
export function kstDateString(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: NEWS_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** 월~금 (KST) */
export function isNewsCollectWeekday(now = new Date()): boolean {
  const dow = new Intl.DateTimeFormat("en-US", {
    timeZone: NEWS_TIMEZONE,
    weekday: "short",
  }).format(now);
  return dow !== "Sat" && dow !== "Sun";
}

export function kstHour(now = new Date()): number {
  const hour = new Intl.DateTimeFormat("en-GB", {
    timeZone: NEWS_TIMEZONE,
    hour: "2-digit",
    hour12: false,
  }).format(now);
  return Number(hour);
}

/**
 * 오늘(KST) 자동 수집 슬롯을 선점한다.
 * 이미 수집했으면 false, 선점 성공이면 true.
 */
async function claimDailyCollectSlot(today: string): Promise<boolean> {
  const existing = await prisma.integrationSetting.findUnique({
    where: { provider: PROVIDER_KEY },
  });

  const lastDate =
    existing?.metadata &&
    typeof existing.metadata === "object" &&
    !Array.isArray(existing.metadata) &&
    typeof (existing.metadata as { lastDate?: unknown }).lastDate === "string"
      ? (existing.metadata as { lastDate: string }).lastDate
      : null;

  if (lastDate === today) return false;

  await prisma.integrationSetting.upsert({
    where: { provider: PROVIDER_KEY },
    create: {
      provider: PROVIDER_KEY,
      displayName: "뉴스 자동 수집(평일 09:00)",
      isEnabled: true,
      metadata: { lastDate: today },
    },
    update: {
      isEnabled: true,
      displayName: "뉴스 자동 수집(평일 09:00)",
      metadata: { lastDate: today },
    },
  });

  return true;
}

async function releaseDailyCollectSlot(today: string): Promise<void> {
  const existing = await prisma.integrationSetting.findUnique({
    where: { provider: PROVIDER_KEY },
  });
  if (!existing) return;

  const lastDate =
    existing.metadata &&
    typeof existing.metadata === "object" &&
    !Array.isArray(existing.metadata) &&
    typeof (existing.metadata as { lastDate?: unknown }).lastDate === "string"
      ? (existing.metadata as { lastDate: string }).lastDate
      : null;

  if (lastDate !== today) return;

  await prisma.integrationSetting.update({
    where: { provider: PROVIDER_KEY },
    data: { metadata: { lastDate: null, lastFailedAt: new Date().toISOString() } },
  });
}

async function runScheduledCollect(source: "cron" | "admin-login", actorId?: string) {
  if (globalForNews.newsDailyCollectInFlight) return;
  if (!isNewsCollectWeekday()) {
    console.log(`[news-auto] 주말 — 수집 안 함 (${kstDateString()})`);
    return;
  }

  globalForNews.newsDailyCollectInFlight = (async () => {
    const today = kstDateString();
    let claimed = false;
    try {
      claimed = await claimDailyCollectSlot(today);
      if (!claimed) {
        console.log(
          `[news-auto] 오늘(${today} ${NEWS_TIMEZONE}) 이미 수집됨 — 스킵`,
        );
        return;
      }

      console.log(
        `[news-auto] 수집 시작 source=${source} ${new Date().toISOString()} ${actorId ?? ""}`,
      );
      const results = await runNewsCollectionJob(source);
      const published = results.filter((x) => x.status === "published").length;
      console.log(
        `[news-auto] 완료: published=${published} total=${results.length}`,
      );
    } catch (e) {
      console.error("[news-auto] 실패:", e);
      if (claimed) {
        try {
          await releaseDailyCollectSlot(today);
        } catch (releaseErr) {
          console.error("[news-auto] 슬롯 해제 실패:", releaseErr);
        }
      }
    } finally {
      globalForNews.newsDailyCollectInFlight = null;
    }
  })();

  await globalForNews.newsDailyCollectInFlight;
}

/**
 * 평일 09:00 이후 관리자 로그인은 당일 미수집일 때만 보조 실행.
 */
export function triggerNewsCollectOnAdminLogin(adminUserId: string): void {
  if (!isNewsCollectWeekday()) return;
  if (kstHour() < 9) return;
  void runScheduledCollect("admin-login", adminUserId);
}

/** 월~금 09:00 Asia/Seoul */
export function startNewsCron(): void {
  if (globalForNews.newsWeekdayCronStarted) return;
  globalForNews.newsWeekdayCronStarted = true;

  cron.schedule(
    "0 9 * * 1-5",
    () => {
      void runScheduledCollect("cron");
    },
    { timezone: NEWS_TIMEZONE },
  );
  console.log("[news-auto] weekday cron registered (09:00 Asia/Seoul, Mon–Fri)");
}
