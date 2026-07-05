import { NextResponse, type NextRequest } from "next/server";

import { getSession } from "@/lib/auth/session";
import { generateDraft } from "@/lib/ai/draft";
import { checkApprovalCompliance } from "@/features/approval/compliance";

export const runtime = "nodejs";
export const maxDuration = 30;

/** 전자결재 작성 중 실시간 AI 힌트 (짧은 제안) */
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
    content?: unknown;
    steps?: unknown;
    mode?: unknown;
  } | null;

  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const purpose = typeof body?.purpose === "string" ? body.purpose.trim() : "";
  const content = typeof body?.content === "string" ? body.content : "";
  const templateName =
    typeof body?.templateName === "string" ? body.templateName.trim() : undefined;
  const documentCategoryId =
    typeof body?.documentCategoryId === "string"
      ? body.documentCategoryId.trim() || undefined
      : undefined;
  const steps = Array.isArray(body?.steps)
    ? body!.steps.filter(
        (s): s is { approverId: string } =>
          !!s && typeof s === "object" && typeof (s as { approverId?: string }).approverId === "string",
      )
    : [];

  if (!purpose && !title) {
    return NextResponse.json({ hints: [] });
  }

  const mode = body?.mode === "full" ? "full" : body?.mode === "compliance" ? "compliance" : "hint";

  if (mode === "compliance") {
    const compliance = checkApprovalCompliance({ title, content, steps });
    return NextResponse.json(compliance);
  }

  if (mode === "full") {
    try {
      const result = await generateDraft({
        title,
        purpose,
        templateName,
        documentCategoryId,
      });
      return NextResponse.json({ content: result.content, mode: result.mode });
    } catch (e) {
      console.error("[api/ai/draft/hint]", e);
      return NextResponse.json({ error: "생성 실패" }, { status: 500 });
    }
  }

  // 실시간 힌트: LLM 없이 빠른 가이드
  const hints: string[] = [];
  if (!title) hints.push("제목에 기안 목적이 드러나도록 작성하세요.");
  if (purpose.length < 20)
    hints.push("기안 목적을 구체적으로 입력하면 AI 초안 품질이 향상됩니다.");
  if (/예산|비용|지출|품의/.test(purpose + title)) {
    hints.push("지출 품의서 양식을 선택하면 금액·예산과목 항목이 자동 구성됩니다.");
    hints.push("행정안전부 공문 지침에 따라 '기안 목적 → 세부 내용 → 기대 효과' 순으로 작성하세요.");
  }
  if (/휴가|연차|병가/.test(purpose + title)) {
    hints.push("휴가 신청서 양식을 사용하고 기간·사유·업무 인수인계를 명시하세요.");
  }
  if (/출장/.test(purpose + title)) {
    hints.push("출장 신청서 양식에서 출장지·목적·예상 경비를 기재하세요.");
  }
  hints.push("AI 초안 작성 버튼으로 행정안전부 공문 스타일 초안을 생성할 수 있습니다.");

  return NextResponse.json({ hints: hints.slice(0, 4) });
}
