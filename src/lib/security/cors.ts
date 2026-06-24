import type { NextRequest } from "next/server";

/**
 * CORS 허용 Origin 목록
 * ALLOWED_ORIGINS=http://intranet.company.local,http://192.168.0.10:8080
 */
function getAllowedOrigins(): string[] {
  const raw = process.env.ALLOWED_ORIGINS ?? process.env.NEXTAUTH_URL ?? "";
  return raw
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
}

function getAllowedIpPrefixes(): string[] {
  const raw = process.env.ALLOWED_IP_PREFIXES ?? "127.0.0.1,10.,172.16.,172.17.,172.18.,192.168.";
  return raw.split(",").map((p) => p.trim()).filter(Boolean);
}

export function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return true; // same-origin / server-side
  const allowed = getAllowedOrigins();
  if (allowed.length === 0) return true;
  return allowed.some((a) => origin === a || origin.startsWith(a));
}

export function isInternalIp(ip: string | null): boolean {
  if (!ip) return true;
  const prefixes = getAllowedIpPrefixes();
  return prefixes.some((p) => ip.startsWith(p));
}

export function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = getAllowedOrigins();
  const effectiveOrigin =
    origin && allowed.includes(origin) ? origin : allowed[0] ?? "";

  if (!effectiveOrigin) return {};

  return {
    "Access-Control-Allow-Origin": effectiveOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-cron-secret",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export function validateCors(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;

  if (!isOriginAllowed(origin)) return false;

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip");
  return isInternalIp(ip);
}
