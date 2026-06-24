import "server-only";

import bcrypt from "bcryptjs";
import { Role, UserApprovalStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import type { RegisterInput } from "@/features/auth/schemas";

export class RegisterError extends Error {
  constructor(
    public readonly code:
      | "EMAIL_TAKEN"
      | "INVALID_DEALER_CODE"
      | "DEALER_CODE_REQUIRED",
    message: string,
  ) {
    super(message);
    this.name = "RegisterError";
  }
}

function mapAffiliationToRole(affiliation: RegisterInput["affiliation"]): Role {
  if (affiliation === "DEALER") return Role.DEALER;
  if (affiliation === "ADMIN") return Role.ADMIN;
  return Role.HEADQUARTER;
}

export async function registerUser(input: RegisterInput) {
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  });
  if (existing) {
    throw new RegisterError("EMAIL_TAKEN", "이미 가입된 이메일입니다.");
  }

  let dealerId: string | null = null;

  if (input.affiliation === "DEALER") {
    const code = input.dealerCode?.trim();
    if (!code) {
      throw new RegisterError(
        "DEALER_CODE_REQUIRED",
        "대리점 코드를 입력하세요.",
      );
    }

    const dealer = await prisma.dealer.findFirst({
      where: { code, isActive: true },
      select: { id: true },
    });
    if (!dealer) {
      throw new RegisterError(
        "INVALID_DEALER_CODE",
        "유효하지 않은 대리점 코드입니다.",
      );
    }
    dealerId = dealer.id;
  }

  const passwordHash = await bcrypt.hash(input.password, 10);

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
      role: mapAffiliationToRole(input.affiliation),
      dealerId,
      isActive: false,
      approvalStatus: UserApprovalStatus.PENDING,
    },
    select: { id: true, email: true, role: true, approvalStatus: true },
  });

  return user;
}
