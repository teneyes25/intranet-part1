import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

const FRENCH_MAISON_PAGE_BUILDER = {
  version: 2,
  companyTheme: { enabled: true, presetId: "french-maison" },
  banner: {
    title: "French Maison",
    subtitle: "Romantic & Modern & Classic",
    buttonText: "인트라넷 시작",
    buttonLink: "/dashboard",
  },
} satisfies Prisma.InputJsonValue;

/**
 * 로컬 DB에 French Maison 회사 테마를 즉시 반영합니다.
 * `npm run db:seed-company-theme`
 */
async function main() {
  await prisma.siteSettings.upsert({
    where: { id: "default" },
    update: {
      appName: "프렌치메종",
      primaryColor: "10 32% 38%",
      sidebarColor: "25 22% 14%",
      sidebarForeground: "40 28% 96%",
      pageBuilderConfig: FRENCH_MAISON_PAGE_BUILDER,
    },
    create: {
      id: "default",
      appName: "프렌치메종",
      primaryColor: "10 32% 38%",
      sidebarColor: "25 22% 14%",
      sidebarForeground: "40 28% 96%",
      pageBuilderConfig: FRENCH_MAISON_PAGE_BUILDER,
    },
  });
  console.log("✅ French Maison company theme applied to site_settings");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
