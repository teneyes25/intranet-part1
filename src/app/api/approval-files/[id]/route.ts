import { readFile } from "node:fs/promises";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { resolveStoredFilePath } from "@/lib/uploads";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session?.user) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const attachment = await prisma.approvalAttachment.findUnique({
    where: { id },
  });
  if (!attachment) return new Response("Not Found", { status: 404 });

  try {
    const data = await readFile(resolveStoredFilePath(attachment.storageKey));
    const encoded = encodeURIComponent(attachment.filename);
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": attachment.mimeType || "application/octet-stream",
        "Content-Length": String(attachment.size),
        "Content-Disposition": `attachment; filename*=UTF-8''${encoded}`,
        "Cache-Control": "private, max-age=0, no-store",
      },
    });
  } catch {
    return new Response("File missing", { status: 404 });
  }
}
