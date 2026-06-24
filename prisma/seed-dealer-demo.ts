/**
 * 대리점 Rollout 데모 — RUN_DEALER_DEMO_SEED=true 시 entrypoint에서 실행
 * SKU, 재고, 샘플 주문, Rollout 그룹
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const busanGroup = await prisma.rolloutGroup.upsert({
    where: { key: "group-2" },
    update: {},
    create: {
      key: "group-2",
      name: "Rollout Group 2 (21~40)",
      sortOrder: 2,
    },
  });

  const busan = await prisma.dealer.upsert({
    where: { code: "BUSAN001" },
    update: { rolloutGroupId: busanGroup.id, region: "부산" },
    create: {
      code: "BUSAN001",
      name: "부산대리점",
      region: "부산",
      rolloutGroupId: busanGroup.id,
      rolloutActive: false,
    },
  });

  const skus = [
    { sku: "SKU-001", name: "프리미엄 상품 A", unitPrice: 15000 },
    { sku: "SKU-002", name: "스탠다드 상품 B", unitPrice: 8500 },
    { sku: "SKU-003", name: "경제형 상품 C", unitPrice: 4200 },
  ];

  for (const s of skus) {
    await prisma.productSku.upsert({
      where: { sku: s.sku },
      update: { name: s.name, unitPrice: s.unitPrice },
      create: s,
    });
  }
  console.log("✅ product SKUs (3)");

  const gangnam = await prisma.dealer.findUnique({ where: { code: "GANGNAM001" } });
  if (gangnam) {
    await prisma.dealer.update({
      where: { id: gangnam.id },
      data: { rolloutActive: true },
    });
  }
  const dealers = [gangnam, busan].filter(Boolean) as { id: string }[];
  const allSkus = await prisma.productSku.findMany();

  for (const d of dealers) {
    for (const sku of allSkus) {
      await prisma.inventoryItem.upsert({
        where: { dealerId_skuId: { dealerId: d.id, skuId: sku.id } },
        update: { quantity: 100 },
        create: { dealerId: d.id, skuId: sku.id, quantity: 100 },
      });
    }
  }
  console.log("✅ inventory per dealer");

  const dealerUser = await prisma.user.findUnique({
    where: { email: "dealer@intranet.local" },
  });
  if (dealerUser && gangnam) {
    const existing = await prisma.order.count();
    if (existing === 0 && allSkus[0]) {
      await prisma.order.create({
        data: {
          orderNumber: `ORD-DEMO-001`,
          buyerDealerId: gangnam.id,
          totalAmount: allSkus[0].unitPrice.mul(2),
          createdById: dealerUser.id,
          status: "PENDING",
          items: {
            create: {
              skuId: allSkus[0].id,
              quantity: 2,
              unitPrice: allSkus[0].unitPrice,
            },
          },
          payment: {
            create: {
              amount: allSkus[0].unitPrice.mul(2),
              status: "PENDING",
            },
          },
          shipment: { create: { status: "PREPARING" } },
        },
      });
      console.log("✅ sample order");
    }
  }

  console.log("✅ dealer demo seed complete");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
