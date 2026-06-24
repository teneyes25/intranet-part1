"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/session";
import { writeAudit } from "@/lib/audit/service";
import { BULK_IMPORT_CSV_HEADER } from "@/features/users/bulk-import/template";

const CSV_HEADER = BULK_IMPORT_CSV_HEADER;

export type BulkImportResult = {
  ok?: boolean;
  error?: string;
  created?: number;
  skipped?: number;
  errors?: string[];
};

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
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

export async function bulkImportUsersAction(csvText: string): Promise<BulkImportResult> {
  await requireRole(["ADMIN"]);

  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return { error: "헤더와 최소 1행의 데이터가 필요합니다." };
  }

  const header = lines[0]?.replace(/^\uFEFF/, "").toLowerCase() ?? "";
  if (header !== CSV_HEADER) {
    return {
      error: `CSV 헤더가 올바르지 않습니다. 다음 형식을 사용하세요:\n${CSV_HEADER}`,
    };
  }

  const dealers = await prisma.dealer.findMany({ select: { id: true, code: true } });
  const dealerByCode = new Map(dealers.map((d) => [d.code.toUpperCase(), d.id]));

  let created = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i] ?? "");
    const email = cols[0]?.trim();
    const name = cols[1]?.trim();
    const roleRaw = cols[2]?.trim();
    const dealerCode = cols[3]?.trim();
    const passwordRaw = cols[4]?.trim();

    if (!email || !name || !roleRaw) {
      errors.push(`${i + 1}행: email, name, role 필수`);
      continue;
    }

    const role = roleRaw.toUpperCase() as Role;
    if (!Object.values(Role).includes(role)) {
      errors.push(`${i + 1}행: 잘못된 role (${roleRaw})`);
      continue;
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      skipped++;
      continue;
    }

    let dealerId: string | null = null;
    if (role === Role.DEALER) {
      if (!dealerCode) {
        errors.push(`${i + 1}행: DEALER 는 dealerCode 필요`);
        continue;
      }
      dealerId = dealerByCode.get(dealerCode.toUpperCase()) ?? null;
      if (!dealerId) {
        errors.push(`${i + 1}행: 대리점 코드 없음 (${dealerCode})`);
        continue;
      }
    }

    const tempPassword = passwordRaw || `Temp${Math.random().toString(36).slice(2, 10)}!1`;
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    await prisma.user.create({
      data: {
        email,
        name,
        role,
        dealerId,
        passwordHash,
        isActive: true,
        approvalStatus: "APPROVED",
        mustChangePassword: true,
      },
    });
    created++;
  }

  void writeAudit({
    action: "BULK_USER_IMPORT",
    detail: `created=${created} skipped=${skipped} errors=${errors.length}`,
    success: errors.length === 0,
  });

  revalidatePath("/admin/users");

  return {
    ok: errors.length === 0,
    created,
    skipped,
    errors: errors.length > 0 ? errors : undefined,
  };
}
