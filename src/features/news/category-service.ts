import "server-only";

import { prisma } from "@/lib/prisma";

export const DEFAULT_NEWS_CATEGORIES = [
  "건설",
  "유통",
  "소비재",
  "프랜차이즈",
  "AI",
  "경제",
  "미래",
] as const;

export async function ensureNewsCategories() {
  const count = await prisma.newsCategory.count();
  if (count > 0) {
    return prisma.newsCategory.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
  }
  await prisma.newsCategory.createMany({
    data: DEFAULT_NEWS_CATEGORIES.map((name, i) => ({
      name,
      sortOrder: (i + 1) * 10,
    })),
  });
  return prisma.newsCategory.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export function listNewsCategories() {
  return ensureNewsCategories();
}

export async function createNewsCategory(name: string) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("카테고리 이름을 입력하세요.");
  const total = await prisma.newsCategory.count();
  return prisma.newsCategory.create({
    data: { name: trimmed, sortOrder: (total + 1) * 10 },
  });
}

export async function updateNewsCategory(id: string, name: string) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("카테고리 이름을 입력하세요.");
  const existing = await prisma.newsCategory.findUnique({ where: { id } });
  if (!existing) throw new Error("카테고리를 찾을 수 없습니다.");
  if (existing.name !== trimmed) {
    await prisma.newsKeyword.updateMany({
      where: { category: existing.name },
      data: { category: trimmed },
    });
  }
  return prisma.newsCategory.update({
    where: { id },
    data: { name: trimmed },
  });
}

export async function deleteNewsCategory(id: string) {
  const existing = await prisma.newsCategory.findUnique({ where: { id } });
  if (!existing) return;
  const inUse = await prisma.newsKeyword.count({
    where: { category: existing.name },
  });
  if (inUse > 0) {
    throw new Error(`「${existing.name}」을(를) 쓰는 키워드가 ${inUse}개 있어 삭제할 수 없습니다.`);
  }
  await prisma.newsCategory.delete({ where: { id } });
}

export async function getNewsCategoryNames(): Promise<string[]> {
  const cats = await ensureNewsCategories();
  return cats.map((c) => c.name);
}
