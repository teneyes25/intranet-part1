import { NextResponse, type NextRequest } from "next/server";

import { getSession } from "@/lib/auth/session";
import { runNewsCollectionJob } from "@/lib/news/job";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * 뉴스 수집을 수동/API로 트리거한다.
 * - 관리자 세션이거나
 * - x-cron-secret 헤더가 CRON_SECRET 과 일치하면 허용.
 * 자동 수집은 월~금 09:00(KST) cron. 당일 미수집이면 관리자 로그인이 보조.
 */
export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const provided = req.headers.get("x-cron-secret");
  const cronAuthorized = Boolean(cronSecret && provided === cronSecret);

  if (!cronAuthorized) {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }
    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "관리자만 실행할 수 있습니다." },
        { status: 403 },
      );
    }
  }

  try {
    const results = await runNewsCollectionJob("api");
    return NextResponse.json({ results });
  } catch (e) {
    console.error("[api/ai/news/collect]", e);
    return NextResponse.json(
      { error: "뉴스 수집 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
