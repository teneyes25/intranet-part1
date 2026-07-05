import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import type { Role } from "@/lib/auth/roles";

export const runtime = "nodejs";

interface TemplateStep {
  approverId: string;
  stepOrder: number;
  label?: string;
}

interface RecommendStep {
  approverId: string;
  stepOrder: number;
  label: string;
  reason: string;
}

const HIGH_AMOUNT = 1_000_000;

async function findRoleUser(role: Role) {
  return prisma.user.findFirst({
    where: { role, isActive: true },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, role: true },
  });
}

function normalizeTemplateSteps(raw: unknown): TemplateStep[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (s): s is TemplateStep =>
        !!s &&
        typeof s === "object" &&
        typeof (s as TemplateStep).approverId === "string" &&
        typeof (s as TemplateStep).stepOrder === "number",
    )
    .sort((a, b) => a.stepOrder - b.stepOrder);
}

/** POST — AI/규칙 기반 결재선 추천 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as {
    documentCategoryId?: unknown;
    drafterRole?: unknown;
    amount?: unknown;
  } | null;

  const drafterRole = (typeof body?.drafterRole === "string"
    ? body.drafterRole
    : session.user.role) as Role;
  const amount =
    typeof body?.amount === "number"
      ? body.amount
      : typeof body?.amount === "string"
        ? parseInt(body.amount.replace(/,/g, ""), 10)
        : undefined;
  const documentCategoryId =
    typeof body?.documentCategoryId === "string"
      ? body.documentCategoryId.trim() || undefined
      : undefined;

  let reason = "기본 결재선 규칙을 적용했습니다.";
  let steps: RecommendStep[] = [];

  const templates = await prisma.approvalLineTemplate.findMany({
    orderBy: [{ isDefault: "desc" }, { sortOrder: "asc" }],
  });

  const matched =
    templates.find((t) => t.targetRole === drafterRole && t.isDefault) ??
    templates.find((t) => t.targetRole === drafterRole) ??
    templates.find((t) => t.isDefault);

  if (matched) {
    const tplSteps = normalizeTemplateSteps(matched.steps);
    const userIds = [...new Set(tplSteps.map((s) => s.approverId))];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds }, isActive: true },
      select: { id: true, name: true, role: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    steps = tplSteps
      .filter((s) => userMap.has(s.approverId))
      .map((s) => ({
        approverId: s.approverId,
        stepOrder: s.stepOrder,
        label: s.label ?? userMap.get(s.approverId)!.name,
        reason: `템플릿「${matched.name}」`,
      }));
    reason = `결재선 템플릿「${matched.name}」을 적용했습니다.`;
  }

  if (steps.length === 0) {
    const hq = await findRoleUser("HEADQUARTER");
    const admin = await findRoleUser("ADMIN");
    if (hq) {
      steps.push({
        approverId: hq.id,
        stepOrder: 1,
        label: "본사 검토",
        reason: "기본 1단계 — 본사",
      });
    }
    if (admin) {
      steps.push({
        approverId: admin.id,
        stepOrder: 2,
        label: "관리자 최종",
        reason: "기본 2단계 — 관리자",
      });
    }
    reason = "등록된 템플릿이 없어 HQ → ADMIN 2단계 기본선을 적용했습니다.";
  }

  if (amount && amount > HIGH_AMOUNT) {
    const admin = await findRoleUser("ADMIN");
    if (admin && !steps.some((s) => s.approverId === admin.id)) {
      const maxOrder = Math.max(0, ...steps.map((s) => s.stepOrder));
      steps.push({
        approverId: admin.id,
        stepOrder: maxOrder + 1,
        label: "고액 최종 승인",
        reason: `금액 ${amount.toLocaleString("ko-KR")}원 — 100만원 초과`,
      });
      reason += " 고액 품의로 관리자 추가 단계를 포함했습니다.";
    }
  }

  if (documentCategoryId) {
    const cat = await prisma.documentCategory.findUnique({
      where: { id: documentCategoryId },
      select: { name: true },
    });
    if (cat) reason += ` (카테고리: ${cat.name})`;
  }

  return NextResponse.json({ steps, reason });
}
