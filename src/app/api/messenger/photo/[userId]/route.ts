import { readFile } from "node:fs/promises";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { resolveStoredFilePath } from "@/lib/uploads";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const session = await getSession();
  if (!session?.user) return new Response("Unauthorized", { status: 401 });
  const { userId } = await params;
  const profile = await prisma.messengerProfile.findUnique({
    where: { userId },
    select: { photoStorageKey: true },
  });
  if (!profile?.photoStorageKey) return new Response("Not Found", { status: 404 });
  try {
    const data = await readFile(resolveStoredFilePath(profile.photoStorageKey));
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch {
    return new Response("File missing", { status: 404 });
  }
}
