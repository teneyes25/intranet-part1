import "server-only";

import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import type { Role } from "@/lib/auth/roles";

function orderScope(dealerId: string | null, role: Role): Prisma.OrderWhereInput {
  if (role === "ADMIN" || role === "HEADQUARTER") return {};
  if (dealerId) {
    return {
      OR: [{ buyerDealerId: dealerId }, { sellerDealerId: dealerId }],
    };
  }
  return { id: "__none__" };
}

export async function listOrders(user: {
  id: string;
  role: Role;
  dealerId: string | null;
}) {
  return prisma.order.findMany({
    where: orderScope(user.dealerId, user.role),
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      buyerDealer: { select: { code: true, name: true } },
      sellerDealer: { select: { code: true, name: true } },
      payment: { select: { status: true } },
      shipment: { select: { status: true, trackingNo: true } },
      _count: { select: { items: true } },
    },
  });
}

export async function getOrder(id: string, user: { role: Role; dealerId: string | null }) {
  const order = await prisma.order.findFirst({
    where: { id, ...orderScope(user.dealerId, user.role) },
    include: {
      items: { include: { sku: true } },
      payment: true,
      shipment: true,
      buyerDealer: true,
      sellerDealer: true,
      approvalDocument: { select: { id: true, title: true, status: true } },
    },
  });
  return order;
}

export async function listInventory(dealerId: string) {
  return prisma.inventoryItem.findMany({
    where: { dealerId },
    include: { sku: true },
    orderBy: { sku: { name: "asc" } },
  });
}

export async function listTrades(user: { role: Role; dealerId: string | null }) {
  const where: Prisma.DealerTradeWhereInput =
    user.role === "ADMIN" || user.role === "HEADQUARTER"
      ? {}
      : user.dealerId
        ? { OR: [{ fromDealerId: user.dealerId }, { toDealerId: user.dealerId }] }
        : { id: "__none__" };

  return prisma.dealerTrade.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      sku: true,
      fromDealer: { select: { code: true, name: true } },
      toDealer: { select: { code: true, name: true } },
    },
  });
}

export function generateOrderNumber(): string {
  const d = new Date();
  const ymd =
    String(d.getFullYear()) +
    String(d.getMonth() + 1).padStart(2, "0") +
    String(d.getDate()).padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `ORD-${ymd}-${rand}`;
}

export async function createOrder(data: {
  buyerDealerId: string;
  sellerDealerId?: string | null;
  createdById: string;
  items: { skuId: string; quantity: number }[];
  approvalDocumentId?: string | null;
}) {
  const skus = await prisma.productSku.findMany({
    where: { id: { in: data.items.map((i) => i.skuId) } },
  });
  const skuMap = new Map(skus.map((s) => [s.id, s] as const));

  let total = new Prisma.Decimal(0);
  const itemRows = data.items.map((item) => {
    const sku = skuMap.get(item.skuId);
    if (!sku) throw new Error(`SKU not found: ${item.skuId}`);
    const unitPrice = sku.unitPrice;
    total = total.add(unitPrice.mul(item.quantity));
    return { skuId: item.skuId, quantity: item.quantity, unitPrice };
  });

  return prisma.order.create({
    data: {
      orderNumber: generateOrderNumber(),
      buyerDealerId: data.buyerDealerId,
      sellerDealerId: data.sellerDealerId ?? null,
      totalAmount: total,
      createdById: data.createdById,
      approvalDocumentId: data.approvalDocumentId ?? null,
      status: "PENDING",
      items: { create: itemRows },
      payment: { create: { amount: total, status: "PENDING" } },
      shipment: { create: { status: "PREPARING" } },
    },
    include: { items: true, payment: true, shipment: true },
  });
}

export async function confirmPayment(orderId: string) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.update({
      where: { orderId },
      data: { status: "PAID", paidAt: new Date(), method: "bank_transfer" },
    });
    await tx.order.update({
      where: { id: orderId },
      data: { status: "CONFIRMED" },
    });
    return payment;
  });
}

export async function confirmShipment(orderId: string, trackingNo?: string) {
  return prisma.$transaction(async (tx) => {
    const shipment = await tx.shipment.update({
      where: { orderId },
      data: {
        status: "DELIVERED",
        trackingNo: trackingNo ?? `TRK-${Date.now()}`,
        shippedAt: new Date(),
        deliveredAt: new Date(),
      },
    });
    await tx.order.update({
      where: { id: orderId },
      data: { status: "DELIVERED" },
    });
    return shipment;
  });
}

export async function createDealerTrade(data: {
  fromDealerId: string;
  toDealerId: string;
  skuId: string;
  quantity: number;
}) {
  return prisma.dealerTrade.create({ data: { ...data, status: "PROPOSED" } });
}
