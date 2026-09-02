import cron from "node-cron";

import { runMessengerRetentionJob } from "@/features/messenger/service";

const g = globalThis as unknown as { messengerRetentionCronStarted?: boolean };

/** 매월 1일 09:10 KST — 1년 경과 대화 삭제 + 백업 안내 */
export function startMessengerRetentionCron() {
  if (g.messengerRetentionCronStarted) return;
  g.messengerRetentionCronStarted = true;
  cron.schedule(
    "10 9 1 * *",
    () => {
      void runMessengerRetentionJob()
        .then((r) =>
          console.log(
            `[messenger] retention purged=${r.purged} notified=${r.notified}`,
          ),
        )
        .catch((e) => console.error("[messenger] retention failed:", e));
    },
    { timezone: "Asia/Seoul" },
  );
  console.log("[messenger] retention cron registered (09:10 KST, 1st of month)");
}
