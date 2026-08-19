import "server-only";

/** Nginx 뒤에서 실행 시 앱 레벨 보안 헤더 중복 방지 */
export function isBehindNginx(): boolean {
  return process.env.BEHIND_NGINX === "true";
}

export function isProductionMode(): boolean {
  return process.env.NODE_ENV === "production";
}

/** 데모 시드 콘텐츠 표시 여부 (RUN_DEMO_SEED) */
export function isDemoSeedEnabled(): boolean {
  return process.env.RUN_DEMO_SEED === "true";
}
