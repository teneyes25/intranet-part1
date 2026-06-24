import { NextResponse } from "next/server";
import { z } from "zod";

import { confirmShipment, getOrder } from "@/features/part2/order-service";
import { jsonError, parseJsonBody, withApiGuard } from "@/lib/security/api-guard";

const patchSchema = z.object({
  trackingNo: z.string().optional(),
});

export const GET = withApiGuard({ tier: "api" }, async (req, { session }) => {
  const segments = req.nextUrl.pathname.split("/");
  const orderId = segments[segments.length - 1];
  if (!orderId) return jsonError("orderId 필요", 400);

  const order = await getOrder(orderId, session!.user);
  if (!order?.shipment) return jsonError("배송 정보 없음", 404);
  return NextResponse.json({ shipment: order.shipment });
});

export const PATCH = withApiGuard(
  { minRole: "HEADQUARTER", tier: "api" },
  async (req, { session }) => {
    const segments = req.nextUrl.pathname.split("/");
    const orderId = segments[segments.length - 1];
    if (!orderId) return jsonError("orderId 필요", 400);

    const order = await getOrder(orderId, session!.user);
    if (!order) return jsonError("주문 없음", 404);

    const parsed = await parseJsonBody(req, patchSchema);
    if ("error" in parsed) return parsed.error;

    const shipment = await confirmShipment(orderId, parsed.data.trackingNo);
    return NextResponse.json({ shipment });
  },
);
