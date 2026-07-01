import { Role } from "@prisma/client";

import { prisma } from "@/lib/prisma";

/** `npm run db:seed-boards-nav` — 게시판 이름·일정 게시판 반영 */
async function main() {
  await prisma.board.upsert({
    where: { key: "schedule" },
    update: {
      name: "일정 게시판",
      description: "사내 일정·행사·마감 안내",
      categories: ["월간일정", "행사", "마감", "교육", "기타"],
      writeRoles: [Role.HEADQUARTER, Role.ADMIN],
    },
    create: {
      key: "schedule",
      name: "일정 게시판",
      description: "사내 일정·행사·마감 안내",
      categories: ["월간일정", "행사", "마감", "교육", "기타"],
      writeRoles: [Role.HEADQUARTER, Role.ADMIN],
    },
  });
  console.log("✅ board: schedule");

  const renames: { key: string; name: string; description: string; categories?: string[] }[] = [
    {
      key: "news",
      name: "업계 뉴스",
      description: "매일 자동 수집되는 업계 뉴스 (AI 요약·출처 포함)",
    },
    {
      key: "pr",
      name: "홍보실(방송 자료실)",
      description: "브랜드 홍보·방송·캠페인 자료",
      categories: ["보도자료", "방송자료", "캠페인", "이벤트"],
    },
    {
      key: "products",
      name: "상품 자료실",
      description: "상품 카탈로그 및 판매 자료",
    },
  ];

  for (const b of renames) {
    const updated = await prisma.board.updateMany({
      where: { key: b.key },
      data: {
        name: b.name,
        description: b.description,
        ...(b.categories ? { categories: b.categories } : {}),
      },
    });
    console.log(`✅ board: ${b.key} → ${b.name} (${updated.count} rows)`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
