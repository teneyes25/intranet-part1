import "server-only";

import cron from "node-cron";

import { prisma } from "@/lib/prisma";

const TTL_MS = 7 * 24 * 60 * 60 * 1000;

const g = globalThis as unknown as {
  aiChatCleanupCronStarted?: boolean;
};

/** 7일 이상 지난 AI 대화 삭제 */
export async function purgeExpiredAiConversations(): Promise<number> {
  const cutoff = new Date(Date.now() - TTL_MS);
  const result = await prisma.aiConversation.deleteMany({
    where: { updatedAt: { lt: cutoff } },
  });
  return result.count;
}

/** 매일 03:20 KST — 오래된 대화 정리 */
export function startAiConversationCleanupCron() {
  if (g.aiChatCleanupCronStarted) return;
  g.aiChatCleanupCronStarted = true;

  cron.schedule(
    "20 3 * * *",
    () => {
      void purgeExpiredAiConversations()
        .then((n) => {
          if (n > 0) console.log(`[ai-chat] purged ${n} conversations older than 7d`);
        })
        .catch((e) => console.error("[ai-chat] purge failed:", e));
    },
    { timezone: "Asia/Seoul" },
  );
  console.log("[ai-chat] conversation TTL cron registered (03:20 Asia/Seoul, 7d)");
}
