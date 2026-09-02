import "server-only";

import { prisma } from "@/lib/prisma";
import { NEWS_TIMEZONE } from "./config";
import { runNewsCollectionJob } from "./job";

const PROVIDER_KEY = "news_auto_collect";

const globalForNews = globalThis as unknown as {
  newsDailyCollectInFlight?: Promise<void> | null;
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
      displayName: "뉴스 자동 수집(관리자 로그인)",
      isEnabled: true,
      metadata: { lastDate: today },
    },
    update: {
      isEnabled: true,
      displayName: "뉴스 자동 수집(관리자 로그인)",
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

/**
 * 시스템 관리자 로그인 시 1일 1회 뉴스 자동 수집을 트리거한다.
 * 로그인 응답을 막지 않도록 fire-and-forget 로 호출한다.
 */
export function triggerNewsCollectOnAdminLogin(adminUserId: string): void {
  if (globalForNews.newsDailyCollectInFlight) return;

  globalForNews.newsDailyCollectInFlight = (async () => {
    const today = kstDateString();
    let claimed = false;
    try {
      claimed = await claimDailyCollectSlot(today);
      if (!claimed) {
        console.log(
          `[news-auto] 오늘(${today} ${NEWS_TIMEZONE}) 이미 수집됨 — 스킵 (admin=${adminUserId})`,
        );
        return;
      }

      console.log(
        `[news-auto] 관리자 로그인 수집 시작: ${new Date().toISOString()} admin=${adminUserId}`,
      );
      const results = await runNewsCollectionJob("admin-login");
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
}

/** @deprecated cron 제거됨 — 하위 호환 no-op */
export function startNewsCron(): void {
  /* no-op: 관리자 로그인 시 1일 1회 수집으로 대체 */
}
