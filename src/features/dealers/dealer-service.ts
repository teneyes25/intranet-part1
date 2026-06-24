import "server-only";

import { prisma } from "@/lib/prisma";

export async function listDealers() {
  return prisma.dealer.findMany({
    orderBy: { name: "asc" },
    include: {
      rolloutGroup: { select: { id: true, key: true, name: true } },
      _count: { select: { users: true } },
    },
  });
}

export async function getDealerById(id: string) {
  return prisma.dealer.findUnique({
    where: { id },
    include: {
      rolloutGroup: true,
      users: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          approvalStatus: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

export async function listRolloutGroups() {
  return prisma.rolloutGroup.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { dealers: true } } },
  });
}

export async function getDealerRolloutStatus(dealerId: string) {
  const dealer = await prisma.dealer.findUnique({
    where: { id: dealerId },
    select: { isActive: true, rolloutActive: true, name: true, code: true },
  });
  return dealer;
}
