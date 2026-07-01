import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { readStoredFileBuffer } from "@/lib/uploads";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await params;
  const attachment = await prisma.attachment.findUnique({ where: { id } });
  if (!attachment) {
    return new Response("Not Found", { status: 404 });
  }

  // 다운로드 로그 기록 (비동기, 실패해도 다운로드는 진행)
  void prisma.downloadLog
    .create({
      data: { attachmentId: id, userId: session.user.id },
    })
    .catch((e) => console.error("[files] download log failed:", e));

  const data = await readStoredFileBuffer(attachment.storageKey);
  if (!data) {
    return new Response("File missing", { status: 404 });
  }

  const encoded = encodeURIComponent(attachment.filename);
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": attachment.mimeType || "application/octet-stream",
      "Content-Length": String(attachment.size),
      "Content-Disposition": `attachment; filename*=UTF-8''${encoded}`,
      "Cache-Control": "private, max-age=0, no-store",
    },
  });
}
