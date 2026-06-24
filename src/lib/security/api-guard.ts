import { NextResponse, type NextRequest } from "next/server";
import type { Session } from "next-auth";
import { z } from "zod";

import { getSession } from "@/lib/auth/session";
import type { Role } from "@/lib/auth/roles";
import { ROLE_RANK } from "@/lib/auth/roles";
import {
  checkRateLimit,
  rateLimitHeaders,
  type RateLimitTier,
} from "@/lib/security/rate-limit";
import { corsHeaders, validateCors } from "@/lib/security/cors";
import { applySecurityHeaders } from "@/lib/security/headers";
import { getClientIp } from "@/lib/audit/service";

export interface ApiGuardOptions {
  tier?: RateLimitTier;
  requireAuth?: boolean;
  minRole?: Role;
  roles?: Role[];
  skipCors?: boolean;
}

export interface ApiContext {
  session: Session | null;
  ip: string | null;
}

type Handler = (
  req: NextRequest,
  ctx: ApiContext,
) => Promise<NextResponse> | NextResponse;

function hasMinRole(userRole: Role, min: Role): boolean {
  return ROLE_RANK[userRole] >= ROLE_RANK[min];
}

export function jsonError(message: string, status: number, extra?: HeadersInit) {
  const res = NextResponse.json({ error: message }, { status });
  applySecurityHeaders(res.headers);
  if (extra) {
    for (const [k, v] of Object.entries(extra)) {
      if (typeof v === "string") res.headers.set(k, v);
    }
  }
  return res;
}

export function withApiGuard(options: ApiGuardOptions, handler: Handler) {
  return async (req: NextRequest): Promise<NextResponse> => {
    if (req.method === "OPTIONS") {
      const origin = req.headers.get("origin");
      const res = new NextResponse(null, { status: 204 });
      const cors = corsHeaders(origin);
      for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
      applySecurityHeaders(res.headers);
      return res;
    }

    if (!options.skipCors && !validateCors(req)) {
      return jsonError("CORS 정책에 의해 거부되었습니다.", 403);
    }

    const ip = getClientIp(req.headers);
    const rateKey = ip ?? req.headers.get("x-forwarded-for") ?? "anonymous";
    const rl = await checkRateLimit(rateKey, options.tier ?? "api");
    const rlHeaders = rateLimitHeaders(rl);

    if (!rl.success) {
      return jsonError("요청 한도를 초과했습니다. 잠시 후 다시 시도하세요.", 429, rlHeaders);
    }

    const session = options.requireAuth !== false ? await getSession() : null;

    if (options.requireAuth !== false && !session?.user) {
      return jsonError("로그인이 필요합니다.", 401, rlHeaders);
    }

    if (session?.user && options.minRole) {
      if (!hasMinRole(session.user.role, options.minRole)) {
        return jsonError("권한이 없습니다.", 403, rlHeaders);
      }
    }

    if (session?.user && options.roles?.length) {
      if (!options.roles.includes(session.user.role)) {
        return jsonError("권한이 없습니다.", 403, rlHeaders);
      }
    }

    try {
      const res = await handler(req, { session, ip });
      applySecurityHeaders(res.headers);
      const origin = req.headers.get("origin");
      for (const [k, v] of Object.entries(corsHeaders(origin))) {
        res.headers.set(k, v);
      }
      for (const [k, v] of Object.entries(rlHeaders)) {
        res.headers.set(k, v);
      }
      return res;
    } catch (e) {
      console.error("[api-guard]", e);
      return jsonError("서버 오류가 발생했습니다.", 500, rlHeaders);
    }
  };
}

export async function parseJsonBody<T>(
  req: NextRequest,
  schema: z.ZodSchema<T>,
): Promise<{ data: T } | { error: NextResponse }> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return { error: jsonError("잘못된 JSON 형식입니다.", 400) };
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다.";
    return { error: jsonError(msg, 422) };
  }
  return { data: parsed.data };
}

export function parseSearchParams<T>(
  req: NextRequest,
  schema: z.ZodSchema<T>,
): { data: T } | { error: NextResponse } {
  const obj = Object.fromEntries(req.nextUrl.searchParams.entries());
  const parsed = schema.safeParse(obj);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "쿼리 파라미터가 올바르지 않습니다.";
    return { error: jsonError(msg, 422) };
  }
  return { data: parsed.data };
}
