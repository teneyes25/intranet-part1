import type { Role } from "@/lib/auth/roles";
import { isProductionMode } from "@/lib/production/config";

/** 정식 배포 모드에서 ADMIN 이 아닌 사용자는 데모 콘텐츠를 숨긴다 */
export function shouldHideDemoContent(role: Role): boolean {
  return isProductionMode() && role !== "ADMIN";
}

export function demoContentWhere(role: Role) {
  if (!shouldHideDemoContent(role)) return {};
  return { isDemo: false } as const;
}
