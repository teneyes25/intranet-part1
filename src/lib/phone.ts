/** 한국 휴대폰 번호 정규화·검증 */

export function digitsOnly(raw: string): string {
  return String(raw ?? "").replace(/\D/g, "");
}

/** 010xxxxxxxx 형태로 정규화. 실패 시 null */
export function normalizePhone(raw: string): string | null {
  let d = digitsOnly(raw);
  if (d.startsWith("82") && d.length >= 11) {
    d = `0${d.slice(2)}`;
  }
  if (!/^01[016789]\d{7,8}$/.test(d)) return null;
  return d;
}

export function formatPhoneDisplay(phone: string | null | undefined): string {
  if (!phone) return "-";
  const d = digitsOnly(phone);
  if (d.length === 11) {
    return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
  }
  if (d.length === 10) {
    return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  }
  return phone;
}

export const phoneSchemaMessage =
  "올바른 휴대폰 번호를 입력하세요. (예: 010-1234-5678)";
