import { NextResponse } from "next/server";
import { withApiGuard } from "@/lib/security/api-guard";
import { importWorker } from "@/lib/erp/bridge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = withApiGuard({ roles: ["ADMIN"] }, async (req, { session }) => {
  const headers = { "Cache-Control": "no-store" };
  const period = new URL(req.url).searchParams.get("period") ?? "";
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period))
    return NextResponse.json({ error: "기준월을 확인하십시오." }, { status: 422, headers });
  try {
    const result = await importWorker({ action: "dashboard", period, actor: session!.user.id });
    return NextResponse.json(result, { status: typeof result.status === "number" ? result.status : 200, headers });
  } catch {
    return NextResponse.json({ error: "지표를 계산하지 못했습니다. 원본은 유지됩니다. 다시 조회하십시오." }, { status: 503, headers });
  }
});
