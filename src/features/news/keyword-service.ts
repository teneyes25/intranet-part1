import "server-only";

import { prisma } from "@/lib/prisma";

export { MAX_NEWS_KEYWORDS, NEWS_CATEGORIES } from "@/features/news/keyword-constants";
import { MAX_NEWS_KEYWORDS } from "@/features/news/keyword-constants";

export function listNewsKeywords() {
  return prisma.newsKeyword.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
}

export async function countActiveKeywords() {
  return prisma.newsKeyword.count({ where: { isActive: true } });
}

export async function createNewsKeyword(data: {
  keyword: string;
  category: string;
}) {
  const total = await prisma.newsKeyword.count();
  if (total >= MAX_NEWS_KEYWORDS) {
    throw new Error(`키워드는 최대 ${MAX_NEWS_KEYWORDS}개까지 등록할 수 있습니다.`);
  }

  return prisma.newsKeyword.create({
    data: {
      keyword: data.keyword.trim(),
      category: data.category,
      sortOrder: total,
    },
  });
}

export function updateNewsKeyword(
  id: string,
  data: Partial<{ keyword: string; category: string; isActive: boolean; sortOrder: number }>,
) {
  return prisma.newsKeyword.update({ where: { id }, data });
}

export function deleteNewsKeyword(id: string) {
  return prisma.newsKeyword.delete({ where: { id } });
}

export function getActiveKeywords() {
  return prisma.newsKeyword.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
}
