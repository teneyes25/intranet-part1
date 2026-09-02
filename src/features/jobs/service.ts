import "server-only";

import { prisma } from "@/lib/prisma";

export const DEFAULT_JOB_NAMES = [
  "영업",
  "총무",
  "인사",
  "디자인",
  "웹디자인",
  "재무",
  "물류",
  "배송",
  "기획관리",
  "판매",
  "이사",
  "대표이사",
] as const;

export async function ensureJobCategories() {
  const count = await prisma.jobCategory.count();
  if (count > 0) {
    return prisma.jobCategory.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
  }
  await prisma.jobCategory.createMany({
    data: DEFAULT_JOB_NAMES.map((name, i) => ({
      name,
      sortOrder: (i + 1) * 10,
    })),
  });
  return prisma.jobCategory.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export function listJobCategories() {
  return ensureJobCategories();
}

export async function createJobCategory(name: string) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("업무 이름을 입력하세요.");
  const total = await prisma.jobCategory.count();
  return prisma.jobCategory.create({
    data: { name: trimmed, sortOrder: (total + 1) * 10 },
  });
}

export async function updateJobCategory(id: string, name: string) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("업무 이름을 입력하세요.");
  return prisma.jobCategory.update({
    where: { id },
    data: { name: trimmed },
  });
}

export async function deleteJobCategory(id: string) {
  const inUse = await prisma.userJob.count({ where: { jobCategoryId: id } });
  if (inUse > 0) {
    throw new Error(`이 업무를 쓰는 사용자가 ${inUse}명 있어 삭제할 수 없습니다.`);
  }
  await prisma.jobCategory.delete({ where: { id } });
}

export async function setUserJobs(userId: string, jobCategoryIds: string[]) {
  const unique = [...new Set(jobCategoryIds.filter(Boolean))];
  await prisma.$transaction([
    prisma.userJob.deleteMany({ where: { userId } }),
    ...(unique.length
      ? [
          prisma.userJob.createMany({
            data: unique.map((jobCategoryId) => ({ userId, jobCategoryId })),
          }),
        ]
      : []),
  ]);
}

export async function userHasJob(userId: string, jobName: string) {
  const n = await prisma.userJob.count({
    where: {
      userId,
      jobCategory: { name: jobName },
    },
  });
  return n > 0;
}

export async function findUsersByJobName(jobName: string) {
  return prisma.user.findMany({
    where: {
      isActive: true,
      approvalStatus: "APPROVED",
      jobs: { some: { jobCategory: { name: jobName } } },
    },
    select: { id: true, name: true, email: true, phone: true },
    orderBy: { name: "asc" },
  });
}

export async function isHrStaff(userId: string) {
  return userHasJob(userId, "인사");
}
