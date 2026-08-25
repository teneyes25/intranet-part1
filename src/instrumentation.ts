/**
 * Next.js instrumentation hook. 서버(Node 런타임) 부팅 시 1회 실행된다.
 * - 뉴스: 관리자 로그인 시 1일 1회 수집
 * - 연차: 매월 말일 09:05 KST 잔여연차 메일 cron
 * - 매종이: 매월 1일 시장조사 보고서 + 대화 7일 TTL 정리
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    console.log("[news-auto] 관리자 로그인 시 1일 1회 자동 수집 모드");
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
  }
}
