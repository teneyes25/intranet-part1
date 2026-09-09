/**
 * Next.js instrumentation hook. 서버(Node 런타임) 부팅 시 1회 실행된다.
 * - 뉴스: 월~금 09:00 KST 자동 수집 (+ 당일 미수집 시 관리자 로그인 보조)
 * - 연차: 매월 말일 09:05 KST 잔여연차 메일 cron
 * - 첨부: 매일 03:40 KST, 1년 경과 파일 삭제
 * - 메종이: 매월 1일 시장조사 보고서 + 대화 7일 TTL 정리
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      const { startNewsCron } = await import("@/lib/news/scheduler");
      startNewsCron();
    } catch (e) {
      console.error("[news-auto] cron 등록 실패:", e);
    }
    try {
      const { startLeaveMonthEndCron } = await import(
        "@/features/leave/scheduler"
      );
      startLeaveMonthEndCron();
    } catch (e) {
      console.error("[leave-mail] cron 등록 실패:", e);
    }
    try {
      const { startMarketReportCron } = await import(
        "@/lib/ai/market-report-scheduler"
      );
      startMarketReportCron();
    } catch (e) {
      console.error("[market-report] cron 등록 실패:", e);
    }
    try {
      const { startAiConversationCleanupCron } = await import(
        "@/features/ai/conversation-cleanup"
      );
      startAiConversationCleanupCron();
    } catch (e) {
      console.error("[ai-chat] cleanup cron 등록 실패:", e);
    }
    try {
      const { startAttachmentRetentionCron } = await import(
        "@/lib/attachment-retention"
      );
      startAttachmentRetentionCron();
    } catch (e) {
      console.error("[attachments] cron 등록 실패:", e);
    }
    try {
      const { startMessengerRetentionCron } = await import(
        "@/features/messenger/scheduler"
      );
      startMessengerRetentionCron();
    } catch (e) {
      console.error("[messenger] cron 등록 실패:", e);
    }
    try {
      const { ensureLlmReady } = await import("@/lib/ai/llm-ensure");
      void ensureLlmReady().then((r) =>
        console.log("[llm-ensure]", r.ok ? r.detail : `대기: ${r.detail}`),
      );
    } catch (e) {
      console.error("[llm-ensure] 기동 실패:", e);
    }
  }
}
