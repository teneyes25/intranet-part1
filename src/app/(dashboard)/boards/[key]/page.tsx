import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Inbox, PenSquare, Settings2 } from "lucide-react";

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
import { PostListBulk } from "@/features/board/components/post-list-bulk";
import {
  BoardViewToolbar,
  type BoardLayoutMode,
} from "@/features/board/components/board-view-toolbar";
import { AnabadaBoardList } from "@/features/anabada/components/anabada-board-list";
import type { AnabadaPostRow } from "@/features/anabada/types";
import { BoardPagination } from "@/features/board/components/board-pagination";
import { InfinitePosts } from "@/features/board/components/infinite-posts";
import { listBoards } from "@/features/board/queries";
import {
  getCustomFolders,
  getUserLabels,
} from "@/features/board-mailbox/queries";
import { CategoryTree } from "@/features/products/components/category-tree";
import {
  getCategoryTree,
  resolveCategoryFilter,
} from "@/features/products/queries";
import { listProductCategoriesFlat } from "@/features/products/category-actions";
import type { BoardPeriodPreset } from "@/features/board/board-search-utils";
import { ScheduleCalendar } from "@/features/schedule/components/schedule-calendar";
import {
  getScheduleEventsForMonth,
  parseMonthParam,
} from "@/features/schedule/queries";

interface PageProps {
  params: Promise<{ key: string }>;
  searchParams: Promise<{
    q?: string;
    category?: string;
    cat?: string;
    from?: string;
    to?: string;
    period?: string;
    author?: string;
    hasAttachment?: string;
    minViews?: string;
    page?: string;
    view?: string;
    layout?: string;
    month?: string;
    calView?: string;
    week?: string;
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
  const isAnabada = key === "anabada";
  const isSchedule = key === "schedule";
  const { year: calYear, month: calMonth } = parseMonthParam(sp.month);
  const canManageCategories =
    isProducts && (user.role === "ADMIN" || user.role === "HEADQUARTER");

  const categoryTree = isProducts ? await getCategoryTree(key) : [];
  const productCategoryFlat = isProducts ? await listProductCategoriesFlat(key) : [];
  const productCategoryNames = productCategoryFlat.map((c) => c.name);

  const categoryNames = isProducts && sp.cat
    ? await resolveCategoryFilter(sp.cat, key)
    : undefined;

  const page = Number(sp.page ?? "1") || 1;
  const infinite = sp.view === "infinite" && !isAnabada;
  const layout: BoardLayoutMode =
    sp.layout === "card" || isAnabada ? "card" : "list";
  const period = (sp.period ?? "all") as BoardPeriodPreset;

  let from: Date | undefined;
  let to: Date | undefined;
  if (sp.from) from = new Date(sp.from);
  if (sp.to) {
    to = new Date(sp.to);
    to.setHours(23, 59, 59, 999);
  }

  const minViewCount = sp.minViews ? Number(sp.minViews) : undefined;
  const hasAttachment = sp.hasAttachment === "1";

  const [result, allBoards, customFolders, userLabels, scheduleEvents] = await Promise.all([
    listPosts({
      boardId: board.id,
      role: user.role,
      q: sp.q,
      category: sp.category,
      categories: categoryNames,
      from,
      to,
      period: period !== "all" ? period : undefined,
      author: sp.author,
      hasAttachment: hasAttachment || undefined,
      minViewCount: minViewCount && !Number.isNaN(minViewCount) ? minViewCount : undefined,
      page,
      withAnabadaFields: isAnabada,
      withCardPreview: layout === "card" && !isAnabada,
    }),
    listBoards(),
    getCustomFolders(user.id, board.id),
    getUserLabels(user.id, board.id),
    isSchedule
      ? getScheduleEventsForMonth(board.id, calYear, calMonth, board.key, user.role)
      : Promise.resolve([]),
  ]);

  const canWrite = canWriteBoard(user.role, board.writeRoles);
  const bulkBoards = allBoards.map((b) => ({ key: b.key, name: b.name }));
  const bulkLabels = userLabels.map((l) => ({
    id: l.id,
    name: l.name,
    color: l.color,
  }));
  const bulkFolders = customFolders.map((f) => ({ id: f.id, name: f.name }));
  const bulkCategories = [
    ...board.categories,
    ...productCategoryNames.filter((n) => !board.categories.includes(n)),
  ];

  const listSection = (
    <>
      {isSchedule && (
        <ScheduleCalendar
          boardKey={board.key}
          year={calYear}
          month={calMonth}
          events={scheduleEvents}
          view={sp.calView === "week" ? "week" : "month"}
          weekStart={sp.week}
        />
      )}
      <BoardFilters
        categories={board.categories}
        productCategoryNames={isProducts ? productCategoryNames : undefined}
      />
      {!isAnabada && (
        <BoardViewToolbar total={result.total} layout={layout} infinite={infinite} />
      )}
      {infinite ? (
        <InfinitePosts
          boardKey={board.key}
          initialItems={result.items}
          initialPage={result.page}
          initialHasMore={result.hasMore}
          query={{
            q: sp.q,
            category: sp.category,
            from: sp.from,
            to: sp.to,
            period: sp.period,
            author: sp.author,
            hasAttachment: sp.hasAttachment,
            minViews: sp.minViews,
          }}
        />
      ) : isAnabada ? (
        <div className="space-y-4">
          <AnabadaBoardList
            boardKey={board.key}
            items={result.items as AnabadaPostRow[]}
            categories={bulkCategories}
            boards={bulkBoards}
            labels={bulkLabels}
            folders={bulkFolders}
            currentUser={{ id: user.id, role: user.role }}
            canWrite={canWrite}
          />
          <BoardPagination page={result.page} totalPages={result.totalPages} />
        </div>
      ) : (
        <div className="space-y-4">
          <PostListBulk
            boardKey={board.key}
            items={result.items}
            categories={bulkCategories}
            boards={bulkBoards}
            labels={bulkLabels}
            folders={bulkFolders}
            searchQuery={sp.q}
            layout={layout}
          />
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
            <Button asChild variant="accent" className="min-h-10">
              <Link href={`/boards/${board.key}/new`}>
                <PenSquare className="h-4 w-4" />
                글쓰기
              </Link>
            </Button>
          )}
          {canManageCategories && (
            <Button asChild variant="outline" className="min-h-10">
              <Link href="/admin/product-categories">
                <Settings2 className="h-4 w-4" />
                카테고리 관리
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
