import { NextResponse } from "next/server";
import { z } from "zod";

import {
  createOrder,
  listOrders,
} from "@/features/part2/order-service";
import { writeAudit } from "@/lib/audit/service";
import { jsonError, parseJsonBody, withApiGuard } from "@/lib/security/api-guard";

const createSchema = z.object({
  buyerDealerId: z.string().optional(),
  sellerDealerId: z.string().optional().nullable(),
  approvalDocumentId: z.string().optional().nullable(),
  items: z
    .array(
      z.object({
        skuId: z.string(),
        quantity: z.number().int().min(1),
      }),
    )
    .min(1),
});

export const GET = withApiGuard({ tier: "api" }, async (_req, { session }) => {
  const user = session!.user;
  if (user.role === "DEALER" && !user.dealerRolloutActive) {
    return jsonError("Rollout 활성화 후 이용 가능합니다.", 403);
  }
  const orders = await listOrders(user);
  return NextResponse.json({ items: orders });
});

export const POST = withApiGuard({ tier: "api" }, async (req, { session }) => {
  const user = session!.user;
  if (user.role === "DEALER" && !user.dealerId) {
    return jsonError("대리점 소속이 필요합니다.", 403);
  }
  if (user.role === "DEALER" && !user.dealerRolloutActive) {
    return jsonError("Rollout 활성화 후 이용 가능합니다.", 403);
  }

  const parsed = await parseJsonBody(req, createSchema);
  if ("error" in parsed) return parsed.error;

  const buyerDealerId =
    user.role === "DEALER" ? user.dealerId! : parsed.data.buyerDealerId;
  if (!buyerDealerId) {
    return jsonError("buyerDealerId가 필요합니다.", 422);
  }

  const order = await createOrder({
    buyerDealerId,
    sellerDealerId: parsed.data.sellerDealerId,
    createdById: user.id,
    items: parsed.data.items,
    approvalDocumentId: parsed.data.approvalDocumentId,
  });

  void writeAudit({
    action: "ORDER_CREATE",
    userId: user.id,
    resource: order.id,
    detail: order.orderNumber,
  });

  return NextResponse.json({ order }, { status: 201 });
});
