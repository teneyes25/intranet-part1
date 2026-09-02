import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { ProductCategoryAdmin } from "@/features/products/components/product-category-admin";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/session";

export const metadata: Metadata = { title: "상품자료실 카테고리" };

export default async function AdminProductCategoriesPage() {
  await requireRole(["ADMIN"]);
  const categories = await prisma.productCategory.findMany({
    where: { boardKey: "products" },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      parentId: true,
      sortOrder: true,
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <PageHeader
          title="상품자료실 카테고리"
          description="추가·수정·삭제 시 게시판 카테고리와 동기화되어 유지됩니다."
        />
        <Button asChild variant="outline">
          <Link href="/boards/products">상품자료실 열기</Link>
        </Button>
      </div>
      <ProductCategoryAdmin categories={categories} />
    </div>
  );
}
