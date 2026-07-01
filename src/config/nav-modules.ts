/**
 * 사이드바 모듈 on/off — false면 메뉴에서만 숨김 (라우트·코드는 유지).
 * 다시 노출하려면 해당 값을 true로 변경하세요.
 */
export const NAV_MODULE_VISIBLE = {
  documents: false,
  attendance: false,
  approval: false,
  search: false,
} as const;

export type NavModuleKey = keyof typeof NAV_MODULE_VISIBLE;

export function isNavModuleVisible(moduleKey?: NavModuleKey): boolean {
  if (!moduleKey) return true;
  return NAV_MODULE_VISIBLE[moduleKey] !== false;
}
