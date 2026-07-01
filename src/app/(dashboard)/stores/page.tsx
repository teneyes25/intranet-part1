import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
      region: true,
      rolloutActive: true,
    },
  });

  const byRegion = dealers.reduce<Record<string, typeof dealers>>((acc, d) => {
    const region = d.region?.trim() || "기타";
    if (!acc[region]) acc[region] = [];
    acc[region].push(d);
    return acc;
  }, {});

  const regions = Object.keys(byRegion).sort((a, b) => a.localeCompare(b, "ko"));

  return (
    <div className="page-shell">
      <PageHeader
        title="매장 찾기"
        description="프렌치메종 대리점·매장 목록입니다. 지역별로 확인하세요."
      />

      {dealers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            등록된 매장이 없습니다. 관리자에게 문의하세요.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {regions.map((region) => (
            <section key={region}>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {region}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {byRegion[region]!.map((store) => (
                  <Card key={store.id} className="shadow-soft">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-base">{store.name}</CardTitle>
                        {store.rolloutActive && (
                          <Badge variant="secondary" className="shrink-0 text-[10px]">
                            운영중
                          </Badge>
                        )}
                      </div>
                      <CardDescription>코드 {store.code}</CardDescription>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                      {store.region ?? "지역 미지정"}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
