import "server-only";

import cron from "node-cron";

import { collectAndPublish } from "./collect";

const globalForCron = globalThis as unknown as {
  newsCronStarted?: boolean;
};

/**
 * 매일 09:00(Asia/Seoul) 뉴스 자동 수집 스케줄을 등록한다.
 * 서버 부팅 시 instrumentation 에서 1회 호출되며, 관리자 지시 없이 동작한다.
 */
export function startNewsCron(): void {
  if (globalForCron.newsCronStarted) return;
  globalForCron.newsCronStarted = true;

  cron.schedule(
    "0 9 * * *",
    () => {
      console.log("[news-cron] 일일 뉴스 수집 시작:", new Date().toISOString());
      collectAndPublish()
        .then((r) => console.log("[news-cron] 완료:", JSON.stringify(r)))
        .catch((e) => console.error("[news-cron] 실패:", e));
    },
    { timezone: "Asia/Seoul" },
  );

  console.log("[news-cron] 매일 09:00(KST) 뉴스 자동 수집 스케줄 등록 완료");
}
