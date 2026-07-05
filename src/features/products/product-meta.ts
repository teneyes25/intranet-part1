import "server-only";

import { prisma } from "@/lib/prisma";

export interface ProductPostMeta {
  sku: string | null;
  unitPrice: number | null;
  totalStock: number;
  isActive: boolean;
}

/** 상품자료실 Post ↔ ProductSku 재고 요약 */
export async function getProductMetaForPost(postId: string): Promise<ProductPostMeta | null> {
  const sku = await prisma.productSku.findFirst({
    where: { productPostId: postId, isActive: true },
    include: {
      inventory: { select: { quantity: true, reserved: true } },
    },
  });
  if (!sku) return null;

  const totalStock = sku.inventory.reduce(
    (sum, i) => sum + Math.max(0, i.quantity - i.reserved),
    0,
  );

  return {
    sku: sku.sku,
    unitPrice: Number(sku.unitPrice),
    totalStock,
    isActive: sku.isActive,
  };
}

export async function getProductMetaMap(
  postIds: string[],
): Promise<Map<string, ProductPostMeta>> {
  if (postIds.length === 0) return new Map();
  const skus = await prisma.productSku.findMany({
    where: { productPostId: { in: postIds }, isActive: true },
    include: { inventory: { select: { quantity: true, reserved: true } } },
  });
  const map = new Map<string, ProductPostMeta>();
  for (const sku of skus) {
    if (!sku.productPostId) continue;
    const totalStock = sku.inventory.reduce(
      (sum, i) => sum + Math.max(0, i.quantity - i.reserved),
      0,
    );
    map.set(sku.productPostId, {
      sku: sku.sku,
      unitPrice: Number(sku.unitPrice),
      totalStock,
      isActive: sku.isActive,
    });
  }
  return map;
}
