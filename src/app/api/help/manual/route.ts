import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

import { withApiGuard } from "@/lib/security/api-guard";

export const GET = withApiGuard({ requireAuth: true, tier: "api" }, async () => {
  const manualPath = path.join(process.cwd(), "USER_MANUAL.md");
  const content = await readFile(manualPath, "utf-8");

  return new NextResponse(content, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": 'attachment; filename="intranet-user-manual.md"',
    },
  });
});
