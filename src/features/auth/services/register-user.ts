import "server-only";

import bcrypt from "bcryptjs";
import { Role, UserApprovalStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import type { RegisterInput } from "@/features/auth/schemas";
import { normalizePhone } from "@/lib/phone";

export class RegisterError extends Error {
  constructor(
    public readonly code: "EMAIL_TAKEN" | "INVALID_PHONE",
    message: string,
  ) {
    super(message);
    this.name = "RegisterError";
  }
}

/**
 * 일반 회원가입 — 소속/역할은 관리자 승인 시 지정.
 * 신청 시점에는 HEADQUARTER 로 대기(비활성) 상태로 생성한다.
 */
export async function registerUser(input: RegisterInput) {
  const email = input.email.trim().toLowerCase();
  const phone = normalizePhone(input.phone);
  if (!phone) {
    throw new RegisterError("INVALID_PHONE", "올바른 휴대폰 번호를 입력하세요.");
  }

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existing) {
    throw new RegisterError("EMAIL_TAKEN", "이미 가입된 이메일입니다.");
  }

  const passwordHash = await bcrypt.hash(input.password, 10);

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email,
      phone,
      passwordHash,
      role: Role.HEADQUARTER,
      dealerId: null,
      isActive: false,
      approvalStatus: UserApprovalStatus.PENDING,
    },
    select: { id: true, email: true, role: true, approvalStatus: true, phone: true },
  });

  return user;
}
