import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ChevronRight,
  FileText,
  Folder,
  PenSquare,
  Settings2,
} from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import {
  ensureFrenchMaisonTree,
  getDocumentBoxBySlug,
  getDocumentBoxTree,
  getFolderBreadcrumb,
  isDocumentBoxManager,
} from "@/features/documents/box-service";
import { canManageDocumentBoxes } from "@/features/documents/permissions";
import { DocumentFolderTree } from "@/features/documents/components/document-folder-tree";
import { ROOT_DOCUMENT_BOX_SLUG } from "@/features/documents/constants";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/features/board/utils";
interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const box = await getDocumentBoxBySlug(slug);
  return { title: box ? `${box.name} · 문서함` : "문서함" };
}

export default async function DocumentFolderPage({ params }: PageProps) {
  const { slug } = await params;
  const user = await requireUser();
  await ensureFrenchMaisonTree();

  const [box, tree, breadcrumb, designated] = await Promise.all([
    getDocumentBoxBySlug(slug),
    getDocumentBoxTree({ activeOnly: true }),
    getFolderBreadcrumb(slug),
    isDocumentBoxManager(user.id),
  ]);

  if (!box || !box.isActive) notFound();

  const canManage = canManageDocumentBoxes({
    role: user.role,
    isDesignatedManager: designated,
  });

  const posts = box.boardId
    ? await prisma.post.findMany({
        where: { boardId: box.boardId },
        include: {
          author: { select: { name: true } },
        },
        orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
        take: 50,
      })
    : [];

  // 문서함 폴더 게시판은 writeRoles 비움 → 인증 사용자 전원 작성 가능
  const canWrite = Boolean(box.board);

  const defaultExpanded = Array.from(
    new Set([ROOT_DOCUMENT_BOX_SLUG, ...breadcrumb.map((b) => b.slug)]),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <nav className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
            <Link href="/documents" className="hover:text-primary">
              문서함
            </Link>
            {breadcrumb.map((b) => (
              <span key={b.id} className="inline-flex items-center gap-1">
                <ChevronRight className="h-3.5 w-3.5" />
                <Link
                  href={`/documents/${b.slug}`}
                  className={
                    b.slug === slug
                      ? "font-medium text-foreground"
                      : "hover:text-primary"
                  }
                >
                  {b.name}
                </Link>
              </span>
            ))}
          </nav>
          <PageHeader
            title={box.name}
            description={
              box.description ??
              "폴더를 선택해 하위 폴더를 열거나, 이 폴더에 기안문·자료를 작성하세요."
            }
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {canManage && (
            <Button asChild variant="outline">
              <Link href="/admin/document-categories">
                <Settings2 className="h-4 w-4" />
                문서함 관리
              </Link>
            </Button>
          )}
          {canWrite && box.board && (
            <Button asChild>
              <Link href={`/boards/${box.board.key}/new`}>
                <PenSquare className="h-4 w-4" />
                이 폴더에 글쓰기
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <Card className="h-fit">
          <CardContent className="p-3">
            <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              폴더 트리
            </p>
            <DocumentFolderTree
              tree={tree}
              defaultExpandedSlugs={defaultExpanded}
            />
          </CardContent>
        </Card>

        <div className="space-y-4">
          {box.children.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-sm font-semibold">하위 폴더</h3>
              <ul className="divide-y rounded-lg border">
                {box.children.map((child) => (
                  <li key={child.id}>
                    <Link
                      href={`/documents/${child.slug}`}
                      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
                    >
                      <Folder className="h-5 w-5 shrink-0 text-amber-600" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{child.name}</p>
                        <p className="text-xs text-muted-foreground">
                          하위 {child._count.children} · 문서{" "}
                          {child._count.documents}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">이 폴더의 문서</h3>
              <div className="flex gap-1">
                <Badge variant="outline" className="text-[10px]">
                  기안문
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  자료
                </Badge>
              </div>
            </div>

            {posts.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-sm text-muted-foreground">
                  이 폴더에 저장된 글이 없습니다.
                  {canWrite && box.board && (
                    <>
                      {" "}
                      <Link
                        href={`/boards/${box.board.key}/new`}
                        className="text-primary underline-offset-2 hover:underline"
                      >
                        글쓰기
                      </Link>
                    </>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="divide-y rounded-lg border">
                {posts.map((p) => (
                  <Link
                    key={p.id}
                    href={`/boards/${box.board!.key}/${p.id}`}
                    className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
                  >
                    <FileText className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-medium">{p.title}</p>
                        {p.category && (
                          <Badge variant="secondary" className="text-[10px]">
                            {p.category}
                          </Badge>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {p.author.name} · {formatDate(p.createdAt)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
