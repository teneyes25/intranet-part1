import type { Metadata } from "next";
import Link from "next/link";

import { PageHero } from "@/components/layout/page-hero";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/session";
import { listProductCategoriesFlat } from "@/features/products/category-actions";
import { ProductCategoryManager } from "@/features/products/components/product-category-manager";

export const metadata: Metadata = { title: "상품자료실 카테고리" };

export default async function ProductCategoriesAdminPage() {
  await requireRole(["ADMIN", "HEADQUARTER"]);
  const categories = await listProductCategoriesFlat("products");

  return (
    <div className="page-shell space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHero
          variant="plain"
          eyebrow="관리자"
          title="상품자료실 카테고리"
          description="폴더(카테고리) 생성·수정·삭제 및 순서 관리"
        />
        <Button asChild variant="outline">
          <Link href="/boards/products">상품자료실 보기</Link>
        </Button>
      </div>
      <ProductCategoryManager boardKey="products" categories={categories} />
    </div>
  );
}
