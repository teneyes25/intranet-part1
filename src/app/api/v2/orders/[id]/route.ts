import { NextResponse } from "next/server";

import { getOrder } from "@/features/part2/order-service";
import { jsonError, withApiGuard } from "@/lib/security/api-guard";

export const GET = withApiGuard({ tier: "api" }, async (req, { session }) => {
  const segments = req.nextUrl.pathname.split("/");
  const id = segments[segments.length - 1];
  if (!id) return jsonError("주문 ID가 필요합니다.", 400);

  const order = await getOrder(id, session!.user);
  if (!order) return jsonError("주문을 찾을 수 없습니다.", 404);
  return NextResponse.json({ order });
});
