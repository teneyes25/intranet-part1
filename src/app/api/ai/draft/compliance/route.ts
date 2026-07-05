import { NextResponse, type NextRequest } from "next/server";

import { getSession } from "@/lib/auth/session";
import { checkApprovalCompliance } from "@/features/approval/compliance";

export const runtime = "nodejs";

/** POST — 제목·본문·결재선 필수 항목 Compliance 검사 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as {
    title?: unknown;
    content?: unknown;
    steps?: unknown;
  } | null;

  const title = typeof body?.title === "string" ? body.title : "";
  const content = typeof body?.content === "string" ? body.content : "";
  const steps = Array.isArray(body?.steps)
    ? body!.steps.filter(
        (s): s is { approverId: string } =>
          !!s && typeof s === "object" && typeof (s as { approverId?: string }).approverId === "string",
      )
    : [];

  const result = checkApprovalCompliance({ title, content, steps });
  return NextResponse.json(result);
}
