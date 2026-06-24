import { NextResponse } from "next/server";
import { z } from "zod";

import {
  createDealerTrade,
  listTrades,
} from "@/features/part2/order-service";
import { jsonError, parseJsonBody, withApiGuard } from "@/lib/security/api-guard";

const createSchema = z.object({
  toDealerId: z.string(),
  skuId: z.string(),
  quantity: z.number().int().min(1),
});

export const GET = withApiGuard({ tier: "api" }, async (_req, { session }) => {
  const trades = await listTrades(session!.user);
  return NextResponse.json({ items: trades });
});

export const POST = withApiGuard({ tier: "api" }, async (req, { session }) => {
  const user = session!.user;
  if (user.role !== "DEALER" || !user.dealerId) {
    return jsonError("대리점 사용자만 거래 제안 가능", 403);
  }
  if (!user.dealerRolloutActive) {
    return jsonError("Rollout 활성화 필요", 403);
  }

  const parsed = await parseJsonBody(req, createSchema);
  if ("error" in parsed) return parsed.error;

  const trade = await createDealerTrade({
    fromDealerId: user.dealerId,
    toDealerId: parsed.data.toDealerId,
    skuId: parsed.data.skuId,
    quantity: parsed.data.quantity,
  });

  return NextResponse.json({ trade }, { status: 201 });
});
