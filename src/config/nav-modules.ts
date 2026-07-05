/**
 * 사이드바 모듈 on/off — false면 메뉴에서만 숨김 (라우트·코드는 유지).
 * Pilot: PILOT_MODE=true 시 approval/documents/search 자동 노출.
 */
export const NAV_MODULE_VISIBLE = {
  documents: false,
  attendance: false,
  approval: false,
  search: false,
} as const;

export type NavModuleKey = keyof typeof NAV_MODULE_VISIBLE;

/** Pilot 모드에서 강제 적용되는 nav 가시성 */
const PILOT_NAV_OVERRIDES: Record<NavModuleKey, boolean> = {
  documents: true,
  approval: true,
  search: true,
  attendance: false,
};

function isPilotMode(): boolean {
  return (
    process.env.PILOT_MODE === "true" ||
    process.env.NEXT_PUBLIC_PILOT_MODE === "true"
  );
}

/** @deprecated getNavModuleVisible 사용 */
export function isNavModuleVisible(moduleKey?: NavModuleKey): boolean {
  return getNavModuleVisible(moduleKey);
}

/**
 * 모듈 메뉴 노출 여부.
 * PILOT_MODE=true 이면 approval/documents/search on, attendance off.
 */
export function getNavModuleVisible(moduleKey?: string): boolean {
  if (!moduleKey) return true;
  if (!(moduleKey in NAV_MODULE_VISIBLE)) return true;

  const key = moduleKey as NavModuleKey;

  if (isPilotMode()) {
    return PILOT_NAV_OVERRIDES[key];
  }

  return NAV_MODULE_VISIBLE[key] !== false;
}

/** /api/health · pilot-checklist 용 스냅샷 */
export function getPilotNavModulesSnapshot(): Record<NavModuleKey, boolean> {
  return {
    documents: getNavModuleVisible("documents"),
    attendance: getNavModuleVisible("attendance"),
    approval: getNavModuleVisible("approval"),
    search: getNavModuleVisible("search"),
  };
}

/** Pilot Must nav — visible 모듈 키 배열 */
export function getVisiblePilotModuleKeys(): NavModuleKey[] {
  return (Object.entries(getPilotNavModulesSnapshot()) as [NavModuleKey, boolean][])
    .filter(([, visible]) => visible)
    .map(([key]) => key);
}
