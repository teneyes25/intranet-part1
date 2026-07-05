/**
 * Pilot Sprint #1 — 전자결재·문서함·KPI 시드
 * npm run db:seed-pilot-approval
 * RUN_DEMO_SEED / RUN_PILOT_SEED 시 seed-demo.ts 에서 연쇄 실행
 */
import {
  ApprovalStatus,
  ApprovalStepStatus,
  PrismaClient,
  Role,
} from "@prisma/client";

const prisma = new PrismaClient();
const SEED_MARKER = "pilot-approval-v1";

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(9 + (n % 4), 30, 0, 0);
  return d;
}

function htmlToPlain(html: string) {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

async function archiveApprovalToDocuments(documentId: string) {
  const doc = await prisma.approvalDocument.findUnique({
    where: { id: documentId },
    include: {
      drafter: { select: { name: true } },
      documentCategory: true,
      archivedDocument: { select: { id: true } },
    },
  });

  if (!doc || doc.status !== ApprovalStatus.COMPLETED || doc.archivedDocument) {
    return null;
  }

  const plain = htmlToPlain(doc.content);
  const description = `${doc.drafter.name} 기안 · ${plain.slice(0, 120)}${plain.length > 120 ? "…" : ""}`;

  return prisma.sharedDocument.create({
    data: {
      title: doc.title,
      description,
      url: `/approval/${doc.id}`,
      documentCategoryId: doc.documentCategoryId,
      category: doc.documentCategory?.name ?? "전자결재",
      approvalDocumentId: doc.id,
      tags: ["전자결재", "완료", "Pilot"],
    },
  });
}

async function main() {
  const existing = await prisma.approvalLineTemplate.findFirst({
    where: { name: "Pilot · 본사 일반" },
  });
  if (existing) {
    console.log("⏭️  pilot approval seed already applied (Pilot · 본사 일반)");
    return;
  }

  const [admin, hq, dealer] = await Promise.all([
    prisma.user.findUnique({ where: { email: "admin@intranet.local" } }),
    prisma.user.findUnique({ where: { email: "hq@intranet.local" } }),
    prisma.user.findUnique({ where: { email: "dealer@intranet.local" } }),
  ]);

  if (!admin || !hq || !dealer) {
    console.log("⚠️  demo users missing — run db:seed-demo first");
    return;
  }

  const tpl = await prisma.approvalTemplate.findFirst({ where: { key: "general" } });
  if (!tpl) {
    console.log("⚠️  approval template missing — run db:seed first");
    return;
  }

  // ── DocumentCategory 3 ──
  const catSpecs = [
    { name: "전자결재", slug: "approval", sortOrder: 0 },
    { name: "인사", slug: "hr", sortOrder: 1 },
    { name: "재무", slug: "finance", sortOrder: 2 },
  ];
  const categories: Record<string, string> = {};
  for (const c of catSpecs) {
    const row = await prisma.documentCategory.upsert({
      where: { slug: c.slug },
      update: { name: c.name, sortOrder: c.sortOrder },
      create: { name: c.name, slug: c.slug, sortOrder: c.sortOrder },
    });
    categories[c.slug] = row.id;
  }
  console.log("✅ DocumentCategory 3 (전자결재, 인사, 재무)");

  // ── ApprovalLineTemplate 2 ──
  await prisma.approvalLineTemplate.createMany({
    data: [
      {
        name: "Pilot · 본사 일반",
        department: "본사",
        targetRole: Role.HEADQUARTER,
        sortOrder: 0,
        isDefault: true,
        steps: [
          { approverId: hq.id, stepOrder: 1, label: "본사 검토" },
          { approverId: admin.id, stepOrder: 2, label: "관리자 최종" },
        ],
      },
      {
        name: "Pilot · 대리점 품의",
        department: "대리점",
        targetRole: Role.DEALER,
        sortOrder: 1,
        isDefault: false,
        steps: [
          { approverId: hq.id, stepOrder: 1, label: "본사 승인" },
          { approverId: admin.id, stepOrder: 2, label: "최종 결재" },
        ],
      },
    ],
  });
  console.log("✅ ApprovalLineTemplate 2");

  // 기존 demo 결재 초기화 (상세 시드로 교체)
  const demoDocs = await prisma.approvalDocument.findMany({
    where: { isDemo: true },
    select: { id: true },
  });
  if (demoDocs.length > 0) {
    const ids = demoDocs.map((d) => d.id);
    await prisma.sharedDocument.deleteMany({
      where: { approvalDocumentId: { in: ids } },
    });
    await prisma.approvalDocument.deleteMany({ where: { id: { in: ids } } });
  }

  const bodyHtml = (title: string) =>
    `<p><strong>${title}</strong></p><p>Pilot Sprint #1 전자결재 데모 본문입니다.</p>`;

  // ── DRAFT 1 (dealer) ──
  await prisma.approvalDocument.create({
    data: {
      title: "Pilot · 대리점 품의 (임시저장)",
      content: bodyHtml("대리점 품의 임시저장"),
      status: ApprovalStatus.DRAFT,
      isDemo: true,
      drafterId: dealer.id,
      templateId: tpl.id,
      documentCategoryId: categories.finance,
    },
  });

  // ── IN_PROGRESS 2 — 2단계 (1단계 승인 완료) ──
  const inProgress2 = await prisma.approvalDocument.create({
    data: {
      title: "Pilot · 품의서 (2단계 진행중)",
      content: bodyHtml("2단계 진행중 — 1단계 승인 완료"),
      status: ApprovalStatus.IN_PROGRESS,
      isDemo: true,
      drafterId: hq.id,
      templateId: tpl.id,
      documentCategoryId: categories.approval,
      currentOrder: 2,
      submittedAt: daysAgo(2),
      steps: {
        create: [
          {
            approverId: hq.id,
            stepOrder: 1,
            status: ApprovalStepStatus.APPROVED,
            actedAt: daysAgo(1),
            comment: "검토 완료",
          },
          {
            approverId: admin.id,
            stepOrder: 2,
            status: ApprovalStepStatus.PENDING,
          },
        ],
      },
    },
  });

  // ── IN_PROGRESS 1 — 1단계 대기 ──
  await prisma.approvalDocument.create({
    data: {
      title: "Pilot · 구매요청 (1단계 대기)",
      content: bodyHtml("1단계 결재 대기"),
      status: ApprovalStatus.IN_PROGRESS,
      isDemo: true,
      drafterId: dealer.id,
      templateId: tpl.id,
      documentCategoryId: categories.finance,
      currentOrder: 1,
      submittedAt: daysAgo(1),
      steps: {
        create: [
          {
            approverId: hq.id,
            stepOrder: 1,
            status: ApprovalStepStatus.PENDING,
          },
        ],
      },
    },
  });

  // ── COMPLETED 1 → SharedDocument ──
  const completed = await prisma.approvalDocument.create({
    data: {
      title: "Pilot · 연차 신청 (결재 완료)",
      content: bodyHtml("연차 신청 — 결재 완료"),
      status: ApprovalStatus.COMPLETED,
      isDemo: true,
      drafterId: hq.id,
      templateId: tpl.id,
      documentCategoryId: categories.hr,
      currentOrder: 1,
      submittedAt: daysAgo(5),
      completedAt: daysAgo(3),
      steps: {
        create: [
          {
            approverId: admin.id,
            stepOrder: 1,
            status: ApprovalStepStatus.APPROVED,
            actedAt: daysAgo(3),
            comment: "승인",
          },
        ],
      },
    },
  });

  const sharedDoc = await archiveApprovalToDocuments(completed.id);
  console.log("✅ COMPLETED → SharedDocument", sharedDoc?.id ?? "(skipped)");

  // ── REJECTED 1 ──
  await prisma.approvalDocument.create({
    data: {
      title: "Pilot · 지출 결의 (반려)",
      content: bodyHtml("지출 결의 — 반려"),
      status: ApprovalStatus.REJECTED,
      isDemo: true,
      drafterId: dealer.id,
      templateId: tpl.id,
      documentCategoryId: categories.finance,
      currentOrder: 1,
      submittedAt: daysAgo(4),
      completedAt: daysAgo(3),
      steps: {
        create: [
          {
            approverId: hq.id,
            stepOrder: 1,
            status: ApprovalStepStatus.REJECTED,
            actedAt: daysAgo(3),
            comment: "증빙 서류 미비",
          },
        ],
      },
    },
  });
  console.log("✅ ApprovalDocument 5 (DRAFT/IN_PROGRESS×2/COMPLETED/REJECTED)");

  // ── DownloadLog (COMPLETED 건 참고 첨부) ──
  const noticesBoard = await prisma.board.findUnique({ where: { key: "notices" } });
  if (noticesBoard) {
    const refPost = await prisma.post.create({
      data: {
        boardId: noticesBoard.id,
        authorId: hq.id,
        title: "Pilot · 결재 완료 문서 참고자료",
        content: `<p>전자결재 완료 문서 「${completed.title}」 참고 첨부입니다.</p>`,
        isDemo: true,
        category: "Pilot",
      },
    });

    const att = await prisma.attachment.create({
      data: {
        postId: refPost.id,
        filename: "pilot-completed-approval.pdf",
        storageKey: "pilot/demo-approval.pdf",
        mimeType: "application/pdf",
        size: 2048,
      },
    });

    await prisma.downloadLog.createMany({
      data: [
        { attachmentId: att.id, userId: hq.id, downloadedAt: daysAgo(2) },
        { attachmentId: att.id, userId: admin.id, downloadedAt: daysAgo(1) },
        { attachmentId: att.id, userId: dealer.id, downloadedAt: daysAgo(0) },
      ],
    });
    console.log("✅ DownloadLog 3 (COMPLETED 참고 첨부)");
  }

  // ── UsageMetric: AI_CHAT 15, APPROVAL_SUBMIT 5 ──
  const since = daysAgo(7);
  await prisma.usageMetric.deleteMany({
    where: {
      createdAt: { gte: since },
      event: { in: ["AI_CHAT", "APPROVAL_SUBMIT"] },
    },
  });

  const usageRows: {
    userId: string;
    event: string;
    resource?: string;
    createdAt: Date;
  }[] = [];

  for (let d = 0; d < 7; d++) {
    const users = [admin.id, hq.id, dealer.id];
    for (let i = 0; i < 2; i++) {
      if (usageRows.filter((r) => r.event === "AI_CHAT").length >= 15) break;
      usageRows.push({
        userId: users[(d + i) % users.length]!,
        event: "AI_CHAT",
        resource: "/ai-agent",
        createdAt: daysAgo(d),
      });
    }
  }
  while (usageRows.filter((r) => r.event === "AI_CHAT").length < 15) {
    usageRows.push({
      userId: hq.id,
      event: "AI_CHAT",
      resource: "/ai-agent",
      createdAt: daysAgo(0),
    });
  }

  for (let d = 0; d < 5; d++) {
    usageRows.push({
      userId: d % 2 === 0 ? hq.id : dealer.id,
      event: "APPROVAL_SUBMIT",
      resource: "/approval/new",
      createdAt: daysAgo(d),
    });
  }

  await prisma.usageMetric.createMany({ data: usageRows });
  console.log("✅ UsageMetric AI_CHAT 15 + APPROVAL_SUBMIT 5");

  console.log(`✅ pilot approval seed complete (${SEED_MARKER})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
