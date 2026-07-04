import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Inbox, PenSquare } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PageHero } from "@/components/layout/page-hero";
import { requireUser } from "@/lib/auth/session";
import { canWriteBoard } from "@/features/board/permissions";
import { canAccessBoard } from "@/lib/auth/access";
import { getBoardByKey, listPosts } from "@/features/board/queries";
import { getSiteSettings, parsePageBuilderConfig } from "@/features/customize/site-settings-service";
import { PageLayoutRenderer } from "@/features/page-layout/components/layout-renderer";
import { getBoardPageLayout } from "@/features/page-layout/service";
import { BoardFilters } from "@/features/board/components/board-filters";
import { PostList } from "@/features/board/components/post-list";
import { BoardPagination } from "@/features/board/components/board-pagination";
import { InfinitePosts } from "@/features/board/components/infinite-posts";
import { CategoryTree } from "@/features/products/components/category-tree";
import {
  getCategoryTree,
  resolveCategoryFilter,
} from "@/features/products/queries";

interface PageProps {
  params: Promise<{ key: string }>;
  searchParams: Promise<{
    q?: string;
    category?: string;
    cat?: string;
    from?: string;
    to?: string;
    page?: string;
    view?: string;
  }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { key } = await params;
  const board = await getBoardByKey(key);
  return { title: board?.name ?? "게시판" };
}

export default async function BoardListPage({ params, searchParams }: PageProps) {
  const { key } = await params;
  const sp = await searchParams;

  const user = await requireUser();
  const [board, settings, boardLayout] = await Promise.all([
    getBoardByKey(key),
    getSiteSettings(),
    getBoardPageLayout(key, user.dealerId),
  ]);
  const pageBuilder = parsePageBuilderConfig(settings.pageBuilderConfig);
  if (!board) notFound();
  if (!canAccessBoard(user.role, key)) notFound();

  const isProducts = key === "products";
  const categoryTree = isProducts ? await getCategoryTree(key) : [];
  const categoryNames = isProducts && sp.cat
    ? await resolveCategoryFilter(sp.cat, key)
    : undefined;

  const page = Number(sp.page ?? "1") || 1;
  const infinite = sp.view === "infinite";

  let from: Date | undefined;
  let to: Date | undefined;
  if (sp.from) from = new Date(sp.from);
  if (sp.to) {
    to = new Date(sp.to);
    to.setHours(23, 59, 59, 999);
  }

  const result = await listPosts({
    boardId: board.id,
    role: user.role,
    q: sp.q,
    category: sp.category,
    categories: categoryNames,
    from,
    to,
    page,
  });

  const canWrite = canWriteBoard(user.role, board.writeRoles);

  const listSection = (
    <>
      <BoardFilters categories={board.categories} />
      <p className="text-sm text-muted-foreground">총 {result.total}건</p>
      {infinite ? (
        <InfinitePosts
          boardKey={board.key}
          initialItems={result.items}
          initialPage={result.page}
          initialHasMore={result.hasMore}
          query={{ q: sp.q, category: sp.category, from: sp.from, to: sp.to }}
        />
      ) : (
        <div className="space-y-4">
          <PostList boardKey={board.key} items={result.items} />
          <BoardPagination page={result.page} totalPages={result.totalPages} />
        </div>
      )}
    </>
  );

  return (
    <div className="page-shell">
      {boardLayout?.html && boardLayout.isPublished ? (
        <PageLayoutRenderer html={boardLayout.html} css={boardLayout.css} />
      ) : null}
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <PageHero
          variant="plain"
          eyebrow="게시판"
          title={
            key === "pr" && !boardLayout?.html && pageBuilder.prHeader?.title
              ? pageBuilder.prHeader.title
              : board.name
          }
          description={
            key === "pr" && !boardLayout?.html && pageBuilder.prHeader?.subtitle
              ? pageBuilder.prHeader.subtitle
              : board.description ?? undefined
          }
        />
        <div className="flex flex-wrap gap-2">
          {canWrite && (
            <Button asChild className="min-h-10">
              <Link href={`/boards/${board.key}/new`}>
                <PenSquare className="h-4 w-4" />
                글쓰기
              </Link>
            </Button>
          )}
          <Button asChild variant="outline" className="min-h-10">
            <Link href={`/boards/${board.key}/mailbox`}>
              <Inbox className="h-4 w-4" />
              메일함 보기
            </Link>
          </Button>
        </div>
      </div>

      {isProducts && categoryTree.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
          <CategoryTree tree={categoryTree} activeSlug={sp.cat} boardKey={key} />
          <div className="min-w-0 space-y-4">{listSection}</div>
        </div>
      ) : (
        listSection
      )}
    </div>
  );
}
