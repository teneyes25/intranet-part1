import "server-only";

import { Role } from "@prisma/client";

import { notifyUsers } from "@/features/notifications/service";
import { writeAudit } from "@/lib/audit/service";
import { prisma } from "@/lib/prisma";

import { collectAndPublish, type CollectResult } from "./collect";

async function notifyNewsAdmins(
  results: CollectResult[],
  source: string,
  fatalError?: string,
) {
  const admins = await prisma.user.findMany({
    where: { role: Role.ADMIN, isActive: true },
    select: { id: true },
  });
  if (admins.length === 0) return;

  const published = results.filter((r) => r.status === "published").length;
  const errors = results.filter((r) => r.status === "error");
  const noResults = results.filter((r) => r.status === "no-result");

  let body: string;
  if (fatalError) {
    body = `뉴스 자동 수집(${source})이 실패했습니다: ${fatalError.slice(0, 180)}`;
  } else {
    const errDetail =
      errors.length > 0
        ? errors
            .slice(0, 3)
            .map((e) => `${e.keyword ?? e.category}: ${e.reason ?? "error"}`)
            .join(", ")
        : "검색 결과 없음 또는 전부 중복";
    body = `게시 ${published}건 · 오류 ${errors.length}건 · 결과없음 ${noResults.length}건. ${errDetail}`;
  }

  await notifyUsers(
    admins.map((a) => a.id),
    {
      type: "SYSTEM",
      title: "[뉴스] 자동 수집 알림",
      body: body.slice(0, 200),
      link: "/admin/news-keywords",
    },
  );
}

export async function runNewsCollectionJob(
  source: "admin-login" | "manual" | "api" | "cron" = "admin-login",
): Promise<CollectResult[]> {
  try {
    const results = await collectAndPublish();
    const published = results.filter((r) => r.status === "published").length;
    const errors = results.filter((r) => r.status === "error");

    await writeAudit({
      action: "AI_NEWS_COLLECT",
      resource: "news",
      detail: `source=${source} published=${published} errors=${errors.length} total=${results.length}`,
      success: errors.length === 0,
    });

    if (errors.length > 0 || (results.length > 0 && published === 0)) {
      await notifyNewsAdmins(results, source);
    }

    return results;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    await writeAudit({
      action: "AI_NEWS_COLLECT",
      resource: "news",
      detail: `source=${source} fatal: ${msg.slice(0, 400)}`,
      success: false,
    });
    await notifyNewsAdmins([], source, msg);
    throw e;
  }
}
