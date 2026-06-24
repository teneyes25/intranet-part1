import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth/auth-options";
import { hasRole, type Role } from "@/lib/auth/roles";

/**
 * 서버 컴포넌트/route handler 에서 현재 세션을 가져온다.
 */
export function getSession() {
  return getServerSession(authOptions);
}

/**
 * 인증이 필요한 페이지에서 사용. 미인증 시 로그인 페이지로 리다이렉트.
 */
export async function requireUser() {
  const session = await getSession();
  if (!session?.user) {
    redirect("/login");
  }
  return session.user;
}

/**
 * 특정 role 이 필요한 페이지에서 사용.
 * 미인증 시 로그인, 권한 부족 시 대시보드로 리다이렉트.
 */
export async function requireRole(allowed: Role[]) {
  const user = await requireUser();
  if (!hasRole(user.role, allowed)) {
    redirect("/dashboard");
  }
  return user;
}
