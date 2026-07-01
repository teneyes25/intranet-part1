import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit/service";

import { resolvePrismaUserFromFirebaseToken } from "@/lib/firebase/auth-server";

const credentialsSchema = z.object({
  email: z.string().email(),
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
        const parsed = credentialsSchema.safeParse(rawCredentials);
        if (!parsed.success) return null;

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
    CredentialsProvider({
      id: "firebase",
      name: "Firebase",
      credentials: {
        idToken: { label: "Firebase ID Token", type: "text" },
      },
      async authorize(rawCredentials) {
        const idToken =
          typeof rawCredentials?.idToken === "string" ? rawCredentials.idToken : "";
        if (!idToken) return null;
        return resolvePrismaUserFromFirebaseToken(idToken);
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
