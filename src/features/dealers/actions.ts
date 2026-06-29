"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/session";
import { writeAudit } from "@/lib/audit/service";
import { syncDealerPageTheme } from "@/features/page-layout/dealer-themes";

const brandingSchema = z.object({
  dealerId: z.string(),
  appNameOverride: z.string().max(100).optional(),
  primaryColor: z.string().max(80).optional(),
  sidebarColor: z.string().max(80).optional(),
  sidebarForeground: z.string().max(80).optional(),
});

export async function updateDealerBrandingAction(formData: FormData) {
  await requireRole(["ADMIN"]);
  const parsed = brandingSchema.safeParse({
    dealerId: formData.get("dealerId"),
    appNameOverride: formData.get("appNameOverride") || undefined,
    primaryColor: formData.get("primaryColor") || undefined,
    sidebarColor: formData.get("sidebarColor") || undefined,
    sidebarForeground: formData.get("sidebarForeground") || undefined,
  });
  if (!parsed.success) return { error: "입력값을 확인하세요." };

  await prisma.dealer.update({
    where: { id: parsed.data.dealerId },
    data: {
      appNameOverride: parsed.data.appNameOverride ?? null,
      primaryColor: parsed.data.primaryColor ?? null,
      sidebarColor: parsed.data.sidebarColor ?? null,
      sidebarForeground: parsed.data.sidebarForeground ?? null,
    },
  });

  await syncDealerPageTheme(parsed.data.dealerId);

  void writeAudit({
    action: "DEALER_ROLLOUT",
    detail: `branding dealer=${parsed.data.dealerId}`,
  });

  revalidatePath("/admin/dealers");
  revalidatePath("/admin/customize/page-builder");
  return { ok: true };
}

export async function toggleDealerActiveAction(dealerId: string, isActive: boolean) {
  await requireRole(["ADMIN"]);
  await prisma.dealer.update({ where: { id: dealerId }, data: { isActive } });
  void writeAudit({ action: "DEALER_ROLLOUT", detail: `active=${isActive} dealer=${dealerId}` });
  revalidatePath("/admin/dealers");
  revalidatePath("/admin/rollout");
}

export async function toggleDealerRolloutAction(dealerId: string, rolloutActive: boolean) {
  await requireRole(["ADMIN"]);
  await prisma.dealer.update({ where: { id: dealerId }, data: { rolloutActive } });
  void writeAudit({
    action: "DEALER_ROLLOUT",
    detail: `rollout=${rolloutActive} dealer=${dealerId}`,
  });
  revalidatePath("/admin/dealers");
  revalidatePath("/admin/rollout");
}

export async function activateRolloutGroupAction(groupId: string) {
  await requireRole(["ADMIN"]);
  await prisma.dealer.updateMany({
    where: { rolloutGroupId: groupId },
    data: { rolloutActive: true },
  });
  void writeAudit({ action: "DEALER_ROLLOUT", detail: `group_activate=${groupId}` });
  revalidatePath("/admin/rollout");
  revalidatePath("/admin/dealers");
}

export async function deactivateRolloutGroupAction(groupId: string) {
  await requireRole(["ADMIN"]);
  await prisma.dealer.updateMany({
    where: { rolloutGroupId: groupId },
    data: { rolloutActive: false },
  });
  void writeAudit({ action: "DEALER_ROLLOUT", detail: `group_deactivate=${groupId}` });
  revalidatePath("/admin/rollout");
  revalidatePath("/admin/dealers");
}

const DEALER_CSV_HEADER = "code,name,region,rolloutGroupKey,rolloutActive";

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  result.push(current.trim());
  return result;
}

export async function bulkImportDealersAction(csvText: string) {
  await requireRole(["ADMIN"]);

  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return { error: "헤더와 데이터가 필요합니다." };

  const header = lines[0]?.replace(/^\uFEFF/, "").toLowerCase() ?? "";
  if (header !== DEALER_CSV_HEADER) {
    return { error: `헤더: ${DEALER_CSV_HEADER}` };
  }

  const groups = await prisma.rolloutGroup.findMany();
  const groupByKey = new Map(groups.map((g: { key: string; id: string }) => [g.key.toUpperCase(), g.id]));

  let created = 0;
  let updated = 0;
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i] ?? "");
    const code = cols[0]?.trim();
    const name = cols[1]?.trim();
    const region = cols[2]?.trim() || null;
    const groupKey = cols[3]?.trim();
    const rolloutRaw = cols[4]?.trim()?.toLowerCase();

    if (!code || !name) {
      errors.push(`${i + 1}행: code, name 필수`);
      continue;
    }

    let rolloutGroupId: string | null = null;
    if (groupKey) {
      const gid = groupByKey.get(groupKey.toUpperCase());
      if (!gid) {
        errors.push(`${i + 1}행: 그룹 없음 (${groupKey})`);
        continue;
      }
      rolloutGroupId = gid;
    }

    const rolloutActive = rolloutRaw === "true" || rolloutRaw === "1";

    const existing = await prisma.dealer.findUnique({ where: { code } });
    if (existing) {
      await prisma.dealer.update({
        where: { code },
        data: { name, region, rolloutGroupId, rolloutActive },
      });
      updated++;
    } else {
      await prisma.dealer.create({
        data: { code, name, region, rolloutGroupId, rolloutActive },
      });
      created++;
    }
  }

  void writeAudit({
    action: "DEALER_IMPORT",
    detail: `created=${created} updated=${updated} errors=${errors.length}`,
    success: errors.length === 0,
  });

  revalidatePath("/admin/dealers");
  revalidatePath("/admin/rollout");

  return { ok: errors.length === 0, created, updated, errors: errors.length ? errors : undefined };
}

export const DEALER_IMPORT_TEMPLATE = `${DEALER_CSV_HEADER}
GANGNAM001,강남대리점,서울,group-1,false
SEOUL002,서초대리점,서울,group-1,false
BUSAN001,부산대리점,부산,group-2,false
DAEGU001,대구대리점,대구,group-3,false
GWANGJU001,광주대리점,광주,group-4,false
JEJU001,제주대리점,제주,group-5,false`;
