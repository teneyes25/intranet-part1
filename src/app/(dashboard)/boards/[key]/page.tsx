import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PenSquare } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { requireUser } from "@/lib/auth/session";
import { canWriteBoard } from "@/features/board/permissions";
import { canAccessBoard } from "@/lib/auth/access";
import { getBoardByKey, listPosts } from "@/features/board/queries";
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

  const [user, board] = await Promise.all([requireUser(), getBoardByKey(key)]);
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
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <PageHeader title={board.name} description={board.description ?? undefined} />
        {canWrite && (
          <Button asChild>
            <Link href={`/boards/${board.key}/new`}>
              <PenSquare className="h-4 w-4" />
              글쓰기
            </Link>
          </Button>
        )}
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
