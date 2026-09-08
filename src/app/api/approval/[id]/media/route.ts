import { readFile } from "node:fs/promises";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { resolveStoredFilePath } from "@/lib/uploads";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session?.user) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const type = new URL(request.url).searchParams.get("type");
  const doc = await prisma.approvalDocument.findUnique({
    where: { id },
    select: { sealStorageKey: true, signatureStorageKey: true },
  });
  if (!doc) return new Response("Not Found", { status: 404 });

  const key =
    type === "signature" ? doc.signatureStorageKey : doc.sealStorageKey;
  if (!key) return new Response("Not Found", { status: 404 });

  try {
    const data = await readFile(resolveStoredFilePath(key));
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch {
    return new Response("File missing", { status: 404 });
  }
}
