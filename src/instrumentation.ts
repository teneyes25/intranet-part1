/**
 * Next.js instrumentation hook. 서버(Node 런타임) 부팅 시 1회 실행된다.
 * 여기서 일일 뉴스 수집 크론을 등록한다.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startNewsCron } = await import("./lib/news/scheduler");
    startNewsCron();
  }
}
