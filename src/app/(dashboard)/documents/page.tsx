import type { Metadata } from "next";
import Link from "next/link";
import { FileText, ExternalLink } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/features/board/utils";
import { backfillDocumentCategoryLinks } from "@/features/documents/category-service";

export const metadata: Metadata = { title: "문서함" };

type DocItem = Awaited<
  ReturnType<
    typeof prisma.sharedDocument.findMany<{
      include: { documentCategory: true; approvalDocument: { select: { id: true; status: true } } };
    }>
  >
>[number];

export default async function DocumentsPage() {
  await requireUser();

  // 관리자 카테고리 변경·시드 레거시 문자열이 문서함에 반영되도록 연결
  await backfillDocumentCategoryLinks();

  const [docs, categories] = await Promise.all([
    prisma.sharedDocument.findMany({
      include: {
        documentCategory: true,
        approvalDocument: { select: { id: true, status: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.documentCategory.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  const grouped = new Map<string, DocItem[]>();
  for (const cat of categories) grouped.set(cat.id, []);
  grouped.set("_uncategorized", []);

  for (const d of docs) {
    const key = d.documentCategoryId ?? "_uncategorized";
    const arr = grouped.get(key) ?? grouped.get("_uncategorized")!;
    arr.push(d);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="문서함"
        description="전자결재 완료 문서를 카테고리별로 보관합니다. 카테고리는 전자결재 기안·관리자 설정과 연동됩니다."
      />

      {categories.length === 0 && docs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            등록된 카테고리·문서가 없습니다. 관리자 → 문서함 카테고리에서 추가하세요.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {categories.map((cat) => {
            const items = grouped.get(cat.id) ?? [];
            return (
              <section key={cat.id}>
                <div className="mb-3 flex flex-wrap items-baseline gap-2">
                  <h3 className="text-sm font-semibold">{cat.name}</h3>
                  <span className="text-xs text-muted-foreground">
                    {items.length}건
                    {cat.description ? ` · ${cat.description}` : ""}
                  </span>
                </div>
                {items.length === 0 ? (
                  <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
                    이 카테고리에 보관된 문서가 없습니다. 전자결재 완료 시 해당 카테고리로 자동 보관됩니다.
                  </p>
                ) : (
                  <DocGrid docs={items} />
                )}
              </section>
            );
          })}
          {(grouped.get("_uncategorized")?.length ?? 0) > 0 && (
            <section>
              <h3 className="mb-3 text-sm font-semibold">미분류</h3>
              <DocGrid docs={grouped.get("_uncategorized")!} />
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function DocGrid({ docs }: { docs: DocItem[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {docs.map((d) => {
        const href =
          d.url ??
          (d.boardKey && d.postId
            ? `/boards/${d.boardKey}/${d.postId}`
            : "/documents");
        const external = href.startsWith("http");
        const label = d.documentCategory?.name ?? d.category;
        return (
          <Link
            key={d.id}
            href={href}
            target={external ? "_blank" : undefined}
          >
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardContent className="p-4">
                <div className="mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  {label && (
                    <Badge variant="secondary" className="text-[10px]">
                      {label}
                    </Badge>
                  )}
                  {d.approvalDocumentId && (
                    <Badge variant="outline" className="text-[10px]">
                      결재완료
                    </Badge>
                  )}
                  {external && (
                    <ExternalLink className="ml-auto h-3 w-3 text-muted-foreground" />
                  )}
                </div>
                <p className="font-medium leading-snug">{d.title}</p>
                {d.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {d.description}
                  </p>
                )}
                <p className="mt-2 text-xs text-muted-foreground">
                  {formatDate(d.updatedAt)}
                </p>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
