import cron from "node-cron";

import { runMonthEndLeaveMailJob } from "@/features/leave/month-end-mail";
import { runMonthEndLeavePromoteNotice } from "@/features/leave/month-end-notice";

const g = globalThis as unknown as { leaveMonthEndCronStarted?: boolean };

/** 매일 09:05 KST — 말일이면 잔여연차 메일 + 연차 촉진 공지 */
export function startLeaveMonthEndCron() {
  if (g.leaveMonthEndCronStarted) return;
  g.leaveMonthEndCronStarted = true;

  cron.schedule(
    "5 9 * * *",
    () => {
      void runMonthEndLeaveMailJob()
        .then((r) => {
          if (!r.skipped) {
            console.log(
              `[leave-mail] month-end done year=${r.year} month=${r.month} sent=${r.sent} failed=${r.failed}`,
            );
          }
        })
        .catch((e) => console.error("[leave-mail] cron failed:", e));

      void runMonthEndLeavePromoteNotice()
        .then((r) => {
          if (!r.skipped) {
            console.log(
              `[leave-notice] posted year=${r.year} month=${r.month} postId=${r.postId} notified=${r.notified}`,
            );
          }
        })
        .catch((e) => console.error("[leave-notice] cron failed:", e));
    },
    { timezone: "Asia/Seoul" },
  );
  console.log(
    "[leave-mail] month-end cron registered (09:05 Asia/Seoul, last day: mail + promote notice)",
  );
}
