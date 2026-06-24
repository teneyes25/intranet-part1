import { NextResponse } from "next/server";
import { z } from "zod";

import { confirmPayment } from "@/features/part2/order-service";
import { getOrder } from "@/features/part2/order-service";
import { jsonError, parseJsonBody, withApiGuard } from "@/lib/security/api-guard";

const schema = z.object({ orderId: z.string() });

export const POST = withApiGuard({ tier: "api" }, async (req, { session }) => {
  const user = session!.user;
  const parsed = await parseJsonBody(req, schema);
  if ("error" in parsed) return parsed.error;

  const order = await getOrder(parsed.data.orderId, user);
  if (!order) return jsonError("주문을 찾을 수 없습니다.", 404);

  const payment = await confirmPayment(parsed.data.orderId);
  return NextResponse.json({ payment });
});
