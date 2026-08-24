import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit/service";

const credentialsSchema = z.object({
  // .local 등 사내 도메인 + 대소문자/공백 허용 후 정규화
  email: z
    .string()
    .trim()
    .min(3)
    .transform((v) => v.toLowerCase())
    .pipe(z.string().email()),
  password: z.string().min(1),
});

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 8, // 8시간
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "이메일", type: "email" },
        password: { label: "비밀번호", type: "password" },
      },
      async authorize(rawCredentials) {
        const parsed = credentialsSchema.safeParse({
          email: String(rawCredentials?.email ?? ""),
          // 앞뒤 공백이 붙으면 bcrypt 불일치 → "비밀번호 오류"로 보임
          password: String(rawCredentials?.password ?? "").trim(),
        });
        if (!parsed.success) {
          void writeAudit({
            action: "LOGIN_FAILURE",
            userEmail: String(rawCredentials?.email ?? "").slice(0, 120),
            detail: "invalid_credentials_format",
            success: false,
          });
          return null;
        }

        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({
          where: { email },
          include: {
            dealer: {
              select: { id: true, name: true, isActive: true, rolloutActive: true },
            },
          },
        });

        if (!user || !user.isActive) {
          void writeAudit({
            action: "LOGIN_FAILURE",
            userEmail: email,
            detail: !user ? "user_not_found" : "inactive",
            success: false,
          });
          return null;
        }
        if (user.approvalStatus !== "APPROVED") {
          void writeAudit({
            action: "LOGIN_FAILURE",
            userEmail: email,
            detail: "pending_approval",
            success: false,
          });
          return null;
        }

        // 시드 직후가 아닌데 hash 가 bcrypt 가 아니면 비교 실패 (시드 누락/잘못된 DB)
        if (
          !user.passwordHash ||
          (!user.passwordHash.startsWith("$2a$") &&
            !user.passwordHash.startsWith("$2b$") &&
            !user.passwordHash.startsWith("$2y$"))
        ) {
          void writeAudit({
            action: "LOGIN_FAILURE",
            userEmail: email,
            userId: user.id,
            detail: "invalid_password_hash",
            success: false,
          });
          return null;
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
          void writeAudit({
            action: "LOGIN_FAILURE",
            userEmail: email,
            userId: user.id,
            detail: "invalid_password",
            success: false,
          });
          return null;
        }

        void writeAudit({
          action: "LOGIN_SUCCESS",
          userId: user.id,
          userEmail: user.email,
          success: true,
        });

        // 시스템 관리자 로그인 시 뉴스 자동 수집 (1일 1회, 비동기)
        if (user.role === "ADMIN") {
          void import("@/lib/news/scheduler")
            .then(({ triggerNewsCollectOnAdminLogin }) => {
              triggerNewsCollectOnAdminLogin(user.id);
            })
            .catch((e) =>
              console.error("[news-auto] 로그인 트리거 실패:", e),
            );
          // 말일이면 잔여연차 메일 잡도 보조 실행
          void import("@/features/leave/month-end-mail")
            .then(({ runMonthEndLeaveMailJob }) => runMonthEndLeaveMailJob())
            .catch((e) => console.error("[leave-mail] 로그인 트리거 실패:", e));
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          dealerId: user.dealerId,
          dealerName: user.dealer?.name ?? null,
          dealerActive: user.dealer?.isActive ?? true,
          dealerRolloutActive: user.dealer?.rolloutActive ?? true,
          mustChangePassword: user.mustChangePassword,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.dealerId = user.dealerId ?? null;
        token.dealerName = user.dealerName ?? null;
        token.dealerActive = user.dealerActive ?? true;
        token.dealerRolloutActive = user.dealerRolloutActive ?? true;
        token.mustChangePassword = user.mustChangePassword ?? false;
      }
      if (trigger === "update" && token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id },
          select: {
            mustChangePassword: true,
            dealer: { select: { isActive: true, rolloutActive: true } },
          },
        });
        if (dbUser) {
          token.mustChangePassword = dbUser.mustChangePassword;
          token.dealerActive = dbUser.dealer?.isActive ?? true;
          token.dealerRolloutActive = dbUser.dealer?.rolloutActive ?? true;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.dealerId = token.dealerId;
        session.user.dealerName = token.dealerName;
        session.user.dealerActive = token.dealerActive ?? true;
        session.user.dealerRolloutActive = token.dealerRolloutActive ?? true;
        session.user.mustChangePassword = token.mustChangePassword ?? false;
      }
      return session;
    },
  },
};
