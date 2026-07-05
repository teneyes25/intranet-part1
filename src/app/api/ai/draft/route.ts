import { NextResponse, type NextRequest } from "next/server";

import { getSession } from "@/lib/auth/session";
import { generateDraft } from "@/lib/ai/draft";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as {
    title?: unknown;
    purpose?: unknown;
    templateName?: unknown;
    documentCategoryId?: unknown;
  } | null;

  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const purpose = typeof body?.purpose === "string" ? body.purpose.trim() : "";
  const templateName =
    typeof body?.templateName === "string" ? body.templateName.trim() : undefined;
  const documentCategoryId =
    typeof body?.documentCategoryId === "string"
      ? body.documentCategoryId.trim() || undefined
      : undefined;

  if (!purpose && !title) {
    return NextResponse.json(
      { error: "제목 또는 기안 목적을 입력하세요." },
      { status: 400 },
    );
  }

  try {
    const result = await generateDraft({ title, purpose, templateName, documentCategoryId });
    return NextResponse.json(result);
  } catch (e) {
    console.error("[api/ai/draft]", e);
    return NextResponse.json(
      { error: "기안 생성 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
