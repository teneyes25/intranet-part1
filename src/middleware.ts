import { NextResponse } from "next/server";
import { withAuth } from "next-auth/middleware";
import { ROLE_RANK, type Role } from "@/lib/auth/roles";
import { applySecurityHeaders } from "@/lib/security/headers";
/**
 * 경로별 최소 권한 매핑.
 * 가장 구체적인 경로가 먼저 매칭되도록 정렬되어 있다.
 */
const ROUTE_MIN_ROLE: { prefix: string; min: Role }[] = [
  { prefix: "/admin", min: "ADMIN" },
  { prefix: "/headquarter", min: "HEADQUARTER" },
];

export default withAuth(
  function middleware(req) {
    const { token } = req.nextauth;
    const { pathname } = req.nextUrl;

    if (
      token?.mustChangePassword &&
      !pathname.startsWith("/settings/change-password") &&
      !pathname.startsWith("/api/auth")
    ) {
      const res = NextResponse.redirect(new URL("/settings/change-password", req.url));
      applySecurityHeaders(res.headers);
      return res;
    }

    if (
      token?.role === "DEALER" &&
      (!token.dealerActive || !token.dealerRolloutActive) &&
      !pathname.startsWith("/help/dealer") &&
      !pathname.startsWith("/settings") &&
      !pathname.startsWith("/api/auth")
    ) {
      const res = NextResponse.redirect(
        new URL("/help/dealer?pending=1", req.url),
      );
      applySecurityHeaders(res.headers);
      return res;
    }

    const rule = ROUTE_MIN_ROLE.find((r) => pathname.startsWith(r.prefix));
    if (rule && token) {
      const userRole = token.role as Role | undefined;
      const ok = userRole && ROLE_RANK[userRole] >= ROLE_RANK[rule.min];
      if (!ok) {
        const res = NextResponse.redirect(new URL("/dashboard", req.url));
        applySecurityHeaders(res.headers);
        return res;
      }
    }

    const res = NextResponse.next();
    applySecurityHeaders(res.headers);
    return res;
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/login",
    },
  },
);

export const config = {
  // 보호할 경로 (로그인/공개 경로 및 정적 리소스 제외)
  matcher: [
    "/dashboard/:path*",
    "/boards/:path*",
    "/approval/:path*",
    "/approval-print/:path*",
    "/search/:path*",
    "/documents/:path*",
    "/ai-agent/:path*",
    "/attendance/:path*",
    "/directions/:path*",
    "/admin/:path*",
    "/headquarter/:path*",
    "/dealer/:path*",
    "/dealer-portal/:path*",
    "/settings/:path*",
    "/help/:path*",
    "/feedback/:path*",
  ],
};
