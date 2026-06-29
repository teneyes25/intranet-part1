import { NextResponse } from "next/server";

import { registerSchema } from "@/features/auth/schemas";
import {
  RegisterError,
  registerUser,
} from "@/features/auth/services/register-user";
import {
  withApiGuard,
  parseJsonBody,
} from "@/lib/security/api-guard";

export const POST = withApiGuard({ tier: "auth", requireAuth: false }, async (req) => {
  const parsed = await parseJsonBody(req, registerSchema);
  if ("error" in parsed) return parsed.error;

  try {
    const user = await registerUser(parsed.data);
    return NextResponse.json(
      { id: user.id, email: user.email, message: "관리자 승인 후 로그인 가능합니다." },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof RegisterError) {
      const status = error.code === "EMAIL_TAKEN" ? 409 : 400;
      return NextResponse.json({ error: error.message }, { status });
    }
    console.error("[register] unexpected error", error);
    return NextResponse.json(
      { error: "회원가입 처리 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
});
