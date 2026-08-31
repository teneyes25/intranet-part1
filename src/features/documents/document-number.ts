import "server-only";

import { prisma } from "@/lib/prisma";

function kstParts(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return {
    year: Number(get("year")),
    monthDay: `${get("month")}${get("day")}`,
  };
}

/** 업무종류 코드 정규화 (문서번호용) */
export function normalizeWorkTypeCode(raw: string | null | undefined) {
  const s = (raw ?? "일반")
    .replace(/\s+/g, "")
    .replace(/[^0-9A-Za-z가-힣_-]/g, "")
    .slice(0, 20);
  return s || "일반";
}

/**
 * 문서번호: 년도-업무종류-월일000
 * 예) 2026-인사-0831001
 */
export async function allocateDocumentNumber(workTypeRaw: string, now = new Date()) {
  const workType = normalizeWorkTypeCode(workTypeRaw);
  const { year, monthDay } = kstParts(now);

  const seq = await prisma.$transaction(async (tx) => {
    const existing = await tx.documentNumberSeq.findUnique({
      where: {
        year_workType_monthDay: { year, workType, monthDay },
      },
    });
    if (existing) {
      return tx.documentNumberSeq.update({
        where: { id: existing.id },
        data: { lastSeq: existing.lastSeq + 1 },
      });
    }
    return tx.documentNumberSeq.create({
      data: { year, workType, monthDay, lastSeq: 1 },
    });
  });

  const num = String(seq.lastSeq).padStart(3, "0");
  return `${year}-${workType}-${monthDay}${num}`;
}
