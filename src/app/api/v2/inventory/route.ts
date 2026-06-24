import { NextResponse } from "next/server";

import { listInventory } from "@/features/part2/order-service";
import { jsonError, withApiGuard } from "@/lib/security/api-guard";

export const GET = withApiGuard({ tier: "api" }, async (req, { session }) => {
  const user = session!.user;
  const dealerId =
    user.role === "DEALER"
      ? user.dealerId
      : req.nextUrl.searchParams.get("dealerId");

  if (!dealerId) {
    return jsonError("dealerId가 필요합니다.", 422);
  }
  if (user.role === "DEALER" && user.dealerId !== dealerId) {
    return jsonError("권한이 없습니다.", 403);
  }

  const items = await listInventory(dealerId);
  return NextResponse.json({ items });
});
