/**
 * Next.js instrumentation hook. 서버(Node 런타임) 부팅 시 1회 실행된다.
 * - 뉴스: 관리자 로그인 시 1일 1회 수집
 * - 연차: 매월 말일 09:05 KST 잔여연차 메일 cron
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
  }
}
