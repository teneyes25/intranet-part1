import type { Metadata } from "next";
import Link from "next/link";
import { FileText, ExternalLink } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/features/board/utils";
import {
  backfillDocumentCategoryLinks,
  listDocumentCategories,
} from "@/features/documents/category-service";
import { DocumentFolderManager } from "@/features/documents/components/document-folder-manager";

export const metadata: Metadata = { title: "문서함" };

type DocItem = Awaited<
  ReturnType<
    typeof prisma.sharedDocument.findMany<{
      include: {
        documentCategory: true;
        approvalDocument: {
          select: {
            id: true;
            status: true;
            documentNumber: true;
            submittedAt: true;
            completedAt: true;
            registeredAt: true;
            executedAt: true;
          };
        };
      };
    }>
  >
>[number];

export default async function DocumentsPage() {
  const user = await requireUser();
  await backfillDocumentCategoryLinks();

  const [docs, categories] = await Promise.all([
    prisma.sharedDocument.findMany({
      include: {
        documentCategory: true,
        approvalDocument: {
          select: {
            id: true,
            status: true,
            documentNumber: true,
            submittedAt: true,
            completedAt: true,
            registeredAt: true,
            executedAt: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
    listDocumentCategories({ userId: user.id, includeOwned: true }),
  ]);

  const visibleCats = categories.filter((c) => {
    if (user.role === "ADMIN") return true;
    if (c.ownerId === user.id) return true;
    return c.isPublic;
  });

  const grouped = new Map<string, DocItem[]>();
  for (const cat of visibleCats) grouped.set(cat.id, []);
  grouped.set("_uncategorized", []);

  const visibleIds = new Set(visibleCats.map((c) => c.id));
  for (const d of docs) {
    if (d.documentCategoryId && !visibleIds.has(d.documentCategoryId)) continue;
    const key = d.documentCategoryId ?? "_uncategorized";
    const arr = grouped.get(key) ?? grouped.get("_uncategorized")!;
    arr.push(d);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="문서함"
        description="전자결재 완료 문서를 보관합니다. 문서번호·기안/결재/등록일자가 표시됩니다."
      />

      <DocumentFolderManager
        folders={visibleCats.map((c) => ({
          id: c.id,
          name: c.name,
          workTypeCode: c.workTypeCode,
          ownerId: c.ownerId,
          retentionYears: c.retentionYears,
          isPublic: c.isPublic,
          _count: c._count,
        }))}
        allFolders={visibleCats.map((c) => ({
          id: c.id,
          name: c.name,
          workTypeCode: c.workTypeCode,
          ownerId: c.ownerId,
          retentionYears: c.retentionYears,
          isPublic: c.isPublic,
        }))}
      />

      {visibleCats.length === 0 && docs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            등록된 문서함이 없습니다. 위에서 문서함을 추가하세요.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {visibleCats.map((cat) => {
            const items = grouped.get(cat.id) ?? [];
            return (
              <section key={cat.id}>
                <div className="mb-3 flex flex-wrap items-baseline gap-2">
                  <h3 className="text-sm font-semibold">{cat.name}</h3>
                  <span className="text-xs text-muted-foreground">
                    {items.length}건
                    {cat.workTypeCode ? ` · 업무종류 ${cat.workTypeCode}` : ""}
                    {cat.retentionYears ? ` · 보존 ${cat.retentionYears}년` : ""}
                    {cat.isPublic ? "" : " · 비공개"}
                    {cat.ownerId ? " · 내 문서함" : " · 공용"}
                  </span>
                </div>
                {items.length === 0 ? (
                  <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
                    보관된 문서가 없습니다.
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
        const docNo =
          d.documentNumber || d.approvalDocument?.documentNumber || null;
        return (
          <Link
            key={d.id}
            href={href}
            target={external ? "_blank" : undefined}
          >
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardContent className="p-4">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  {docNo && (
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {docNo}
                    </Badge>
                  )}
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
                <div className="mt-2 space-y-0.5 text-[11px] text-muted-foreground">
                  {d.draftedAt && <p>기안 {formatDate(d.draftedAt)}</p>}
                  {d.approvedAt && <p>결재 {formatDate(d.approvedAt)}</p>}
                  {d.approvalDocument?.executedAt && (
                    <p>시행 {formatDate(d.approvalDocument.executedAt)}</p>
                  )}
                  {d.registeredAt && <p>등록 {formatDate(d.registeredAt)}</p>}
                  {!d.draftedAt && !d.approvedAt && !d.registeredAt && (
                    <p>{formatDate(d.updatedAt)}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
