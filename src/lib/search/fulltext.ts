import "server-only";

import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export async function fullTextSearchPosts(
  query: string,
  boardIds: string[],
  limit = 20,
): Promise<
  Array<{
    id: string;
    title: string;
    content: string;
    category: string | null;
    createdAt: Date;
    boardKey: string;
    boardName: string;
    rank: number;
  }>
> {
  if (!query.trim() || boardIds.length === 0) return [];

  const pattern = `%${query.replace(/[%_]/g, "")}%`;

  try {
    const rows = await prisma.$queryRaw<
      Array<{
        id: string;
        title: string;
        content: string;
        category: string | null;
        created_at: Date;
        board_key: string;
        board_name: string;
        rank: number;
      }>
    >`
      SELECT p.id, p.title, p.content, p.category, p."createdAt" as created_at,
             b.key as board_key, b.name as board_name,
             COALESCE(
               ts_rank(
                 to_tsvector('simple', coalesce(p.title,'') || ' ' || regexp_replace(coalesce(p.content,''), '<[^>]+>', ' ', 'g')),
                 plainto_tsquery('simple', ${query})
               ), 0
             ) as rank
      FROM posts p
      JOIN boards b ON b.id = p."boardId"
      WHERE p."boardId" IN (${Prisma.join(boardIds)})
        AND (
          to_tsvector('simple', coalesce(p.title,'') || ' ' || regexp_replace(coalesce(p.content,''), '<[^>]+>', ' ', 'g'))
            @@ plainto_tsquery('simple', ${query})
          OR p.title ILIKE ${pattern}
        )
      ORDER BY rank DESC, p."createdAt" DESC
      LIMIT ${limit}
    `;

    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      content: r.content,
      category: r.category,
      createdAt: r.created_at,
      boardKey: r.board_key,
      boardName: r.board_name,
      rank: Number(r.rank),
    }));
  } catch (e) {
    console.error("[fulltext] search failed:", e);
    return [];
  }
}
