import "server-only";

import { listOrders, listInventory } from "@/features/part2/order-service";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/lib/auth/roles";

export async function getDealerPortalStats(user: {
  id: string;
  role: Role;
  dealerId: string | null;
  dealerName?: string | null;
}) {
  const [orders, inventory, noticeCount] = await Promise.all([
    listOrders(user),
    user.dealerId ? listInventory(user.dealerId) : Promise.resolve([]),
    prisma.post.count({
      where: {
        board: { key: "notices" },
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    }),
  ]);

  const pendingOrders = orders.filter((o) =>
    ["PENDING", "CONFIRMED", "DRAFT"].includes(o.status),
  ).length;

  const lowStock = inventory.filter((i) => i.quantity <= 5).length;

  return {
    orderCount: orders.length,
    pendingOrders,
    inventorySkus: inventory.length,
    lowStock,
    recentNotices: noticeCount,
    recentOrders: orders.slice(0, 5),
  };
}
