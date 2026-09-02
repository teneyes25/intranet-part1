import { readFile } from "node:fs/promises";

import { getSession } from "@/lib/auth/session";
import { getAttachmentForUser, writeMessengerLog } from "@/features/messenger/service";
import { resolveStoredFilePath } from "@/lib/uploads";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session?.user) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;
  const att = await getAttachmentForUser(session.user.id, id);
  if (!att) return new Response("Not Found", { status: 404 });

  let data: Buffer;
  try {
    data = await readFile(resolveStoredFilePath(att.storageKey));
  } catch {
    return new Response("File missing", { status: 404 });
  }
  const encoded = encodeURIComponent(att.filename);
  void writeMessengerLog({
    action: "file_download",
    actorId: session.user.id,
    messageId: att.messageId,
    detail: att.filename,
  });
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": att.mimeType || "application/octet-stream",
      "Content-Length": String(att.size),
      "Content-Disposition": `attachment; filename*=UTF-8''${encoded}`,
      "Cache-Control": "private, max-age=0, no-store",
    },
  });
}
