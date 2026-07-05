import { test, type APIRequestContext } from "@playwright/test";

/** Sprint #3 기능이 배포된 환경인지 확인 (미배포 시 suite skip) */
export async function requireSprint3Deployment(request: APIRequestContext) {
  let body: { features?: Record<string, boolean>; version?: string } = {};
  try {
    const res = await request.get("/api/health");
    if (res.ok()) body = await res.json();
  } catch {
    /* connection refused 등 */
  }

  const ready =
    body.features?.commandPalette === true &&
    body.features?.activityFeed === true &&
    body.features?.quickSearch === true;

  if (!ready) {
    test.skip(
      true,
      `Sprint #3 미배포 (version=${body.version ?? "unknown"}). npm run docker:sync 후 재실행하세요.`,
    );
  }
}
