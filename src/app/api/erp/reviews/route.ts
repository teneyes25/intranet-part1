import { NextResponse } from "next/server";
import { withApiGuard } from "@/lib/security/api-guard";
import { importWorker } from "@/lib/erp/bridge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const options = { roles: ["ADMIN" as const] };
const headers = { "Cache-Control": "no-store" };
export const GET = withApiGuard(options, async (_req, { session }) => {
  try {
    const result = await importWorker({ action: "review_state", actor: session!.user.id });
    return NextResponse.json(result, { status: typeof result.status === "number" ? result.status : 200, headers });
  } catch { return NextResponse.json({ error: "비용 검토 자료를 불러오지 못했습니다." }, { status: 503, headers }); }
});
export const POST = withApiGuard(options, async (req, { session }) => {
  const expected = process.env.NEXTAUTH_URL;
  if (!expected || req.headers.get("origin") !== new URL(expected).origin)
    return NextResponse.json({ error: "허용되지 않은 요청 출처입니다." }, { status: 403, headers });
  try {
    const reader = req.body?.getReader();
    if (!reader) return NextResponse.json({ error: "입력 내용이 필요합니다." }, { status: 400, headers });
    const chunks: Uint8Array[] = []; let size = 0;
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > 1024 * 1024) { await reader.cancel(); return NextResponse.json({ error: "요청이 너무 큽니다." }, { status: 413, headers }); }
      chunks.push(value);
    }
    let payload;
    try { payload = JSON.parse(Buffer.concat(chunks).toString("utf8")); }
    catch { return NextResponse.json({ error: "잘못된 입력입니다." }, { status: 400, headers }); }
    if (!payload || !["save_review", "allocate"].includes(payload.action))
      return NextResponse.json({ error: "지원하지 않는 작업입니다." }, { status: 400, headers });
    const result = await importWorker({ ...payload, actor: session!.user.id });
    return NextResponse.json(result, { status: typeof result.status === "number" ? result.status : 200, headers });
  } catch { return NextResponse.json({ error: "검토 저장에 실패했습니다. 이전 기록은 유지됩니다." }, { status: 503, headers }); }
});
