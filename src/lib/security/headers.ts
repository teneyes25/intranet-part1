/** Next.js headers() / middleware 공통 보안 헤더 */
export const SECURITY_HEADERS: Record<string, string> = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "X-XSS-Protection": "1; mode=block",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://oapi.map.naver.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https: https://*.map.naver.com https://*.naver.net",
    "font-src 'self' data:",
    "connect-src 'self' https://api.openai.com https://openapi.naver.com https://oapi.map.naver.com https://*.map.naver.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; "),
};

export function applySecurityHeaders(
  headers: Headers,
): void {
  if (process.env.BEHIND_NGINX === "true") {
    return;
  }
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    if (process.env.NODE_ENV !== "production" && key === "Strict-Transport-Security") {
      continue;
    }
    headers.set(key, value);
  }
}
