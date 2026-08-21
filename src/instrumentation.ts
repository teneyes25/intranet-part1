/**
 * Next.js instrumentation hook. 서버(Node 런타임) 부팅 시 1회 실행된다.
 * 뉴스 수집은 관리자 로그인 시 1일 1회로 트리거된다 (cron 미사용).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    console.log("[news-auto] 관리자 로그인 시 1일 1회 자동 수집 모드");
  }
}
