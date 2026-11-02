import { NextResponse } from "next/server";
import { withApiGuard } from "@/lib/security/api-guard";
import { importWorker } from "@/lib/erp/bridge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const options = { roles: ["ADMIN" as const] };
export const GET = withApiGuard(options, async () => {
  try { return NextResponse.json(await importWorker({ action: "list" }), { headers: { "Cache-Control": "no-store" } }); }
  catch { return NextResponse.json({ error: "ERP 보관 경로 또는 실행환경을 확인하십시오." }, { status: 503 }); }
});
export const POST = withApiGuard(options, async (req, { session }) => {
  // Require exact configured origin; shared CORS helper accepts prefixes.
  const expected = process.env.NEXTAUTH_URL;
  if (!expected || req.headers.get("origin") !== new URL(expected).origin) {
    return NextResponse.json({ error: "허용되지 않은 요청 출처입니다." }, { status: 403 });
  }
  const size = Number(req.headers.get("content-length"));
  if (!size || size > 11 * 1024 * 1024) return NextResponse.json({ error: "요청 크기를 확인하십시오." }, { status: 413 });
  try {
    const reader = req.body?.getReader();
    if (!reader) return NextResponse.json({ error: "파일이 필요합니다." }, { status: 400 });
    const chunks: Uint8Array<ArrayBuffer>[] = [];
    let bytes = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 11 * 1024 * 1024) {
        await reader.cancel();
        return NextResponse.json({ error: "요청이 너무 큽니다." }, { status: 413 });
      }
      chunks.push(new Uint8Array(value));
    }
    const form = await new Response(new Blob(chunks), { headers: { "Content-Type": req.headers.get("content-type") ?? "" } }).formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "10MB 이하 XLSX 파일이 필요합니다." }, { status: 400 });
    const result = await importWorker({ action: "import", actor: session!.user.id,
      kind: form.get("kind"), period: form.get("period"), sheet: form.get("sheet"),
      expectedActive: form.get("expectedActive") || null, filename: file.name,
      data: Buffer.from(await file.arrayBuffer()).toString("base64"),
    });
    return NextResponse.json(result, { status: typeof result.status === "number" ? result.status : 200 });
  } catch { return NextResponse.json({ error: "업로드 처리 실패. 실행환경을 확인하고 다시 시도하십시오." }, { status: 503 }); }
});
