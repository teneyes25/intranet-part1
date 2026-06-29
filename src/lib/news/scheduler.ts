import "server-only";

import cron from "node-cron";

import {
  NEWS_CRON_SCHEDULE,
  NEWS_CRON_TIMEZONE,
} from "./config";
import { runNewsCollectionJob } from "./job";

const globalForCron = globalThis as unknown as {
  newsCronStarted?: boolean;
};

/**
 * 매일 09:00(Asia/Seoul) 뉴스 자동 수집 스케줄을 등록한다.
 * NEWS_CRON_SCHEDULE 환경변수로 cron 표현식 변경 가능.
 */
export function startNewsCron(): void {
  if (globalForCron.newsCronStarted) return;
  globalForCron.newsCronStarted = true;

  if (!cron.validate(NEWS_CRON_SCHEDULE)) {
    console.error(
      "[news-cron] 잘못된 NEWS_CRON_SCHEDULE:",
      NEWS_CRON_SCHEDULE,
    );
    return;
  }

  cron.schedule(
    NEWS_CRON_SCHEDULE,
    () => {
      console.log("[news-cron] 일일 뉴스 수집 시작:", new Date().toISOString());
      runNewsCollectionJob("cron")
        .then((r) => {
          const published = r.filter((x) => x.status === "published").length;
          console.log(
            `[news-cron] 완료: published=${published} total=${r.length}`,
          );
        })
        .catch((e) => console.error("[news-cron] 실패:", e));
    },
    { timezone: NEWS_CRON_TIMEZONE },
  );

  console.log(
    `[news-cron] 스케줄 등록 완료 (${NEWS_CRON_SCHEDULE}, ${NEWS_CRON_TIMEZONE})`,
  );
}
