import "server-only";

/** PILOT_MODE=true 가 아니면 정식(Production) 배포 모드 */
export function isProductionMode(): boolean {
  return process.env.PILOT_MODE !== "true";
}

/** Nginx 뒤에서 실행 시 앱 레벨 보안 헤더 중복 방지 */
export function isBehindNginx(): boolean {
  return process.env.BEHIND_NGINX === "true";
}

/** RUN_DEMO_SEED 는 Pilot/개발 전용 — 정식 배포 시 ADMIN UI 에서만 안내 */
export function isDemoSeedEnabled(): boolean {
  return process.env.RUN_DEMO_SEED === "true";
}
