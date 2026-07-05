import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { StoreLocator } from "@/features/stores/components/store-locator";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "매장 찾기",
};

export default async function StoresPage() {
  await requireUser();

  const dealers = await prisma.dealer.findMany({
    where: { rolloutActive: true },
    orderBy: [{ region: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      code: true,
      address: true,
      phone: true,
      businessHours: true,
      latitude: true,
      longitude: true,
    },
  });

  return (
    <div className="page-shell">
      <PageHeader
        title="매장 찾기"
        description="프렌치메종 대리점·매장 위치를 지도에서 확인하세요."
      />

      <StoreLocator stores={dealers} />
    </div>
  );
}
