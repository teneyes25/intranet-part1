/**
 * Pilot 데모 데이터 시드 — RUN_DEMO_SEED=true 시 entrypoint에서 실행
 * 공지 10건, 게시물 20건, 전자결재 5건, Pilot 그룹 멤버, AI ingest 이력
 */
import {
  ApprovalStatus,
  ApprovalStepStatus,
  PrismaClient,
  Role,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("password1234", 10);

  const dealer = await prisma.dealer.upsert({
    where: { code: "GANGNAM001" },
    update: {},
    create: { code: "GANGNAM001", name: "강남대리점" },
  });

  const usersSpec = [
    { email: "admin@intranet.local", name: "시스템 관리자", role: Role.ADMIN, dealerId: null as string | null },
    { email: "hq@intranet.local", name: "본사 담당자", role: Role.HEADQUARTER, dealerId: null },
    { email: "dealer@intranet.local", name: "대리점 담당자", role: Role.DEALER, dealerId: dealer.id },
    { email: "pilot-sales@intranet.local", name: "Pilot 영업팀", role: Role.HEADQUARTER, dealerId: null },
    { email: "pilot-mgmt@intranet.local", name: "Pilot 관리팀", role: Role.HEADQUARTER, dealerId: null },
  ];

  const users: Record<string, string> = {};
  for (const u of usersSpec) {
    const row = await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role, dealerId: u.dealerId, isActive: true, approvalStatus: "APPROVED", mustChangePassword: false },
      create: {
        email: u.email,
        name: u.name,
        role: u.role,
        dealerId: u.dealerId,
        passwordHash: password,
        isActive: true,
        approvalStatus: "APPROVED",
        mustChangePassword: false,
      },
    });
    users[u.email] = row.id;
  }
  console.log("✅ demo users (5 accounts)");

  const salesGroup = await prisma.pilotGroup.findUnique({ where: { key: "sales" } });
  const mgmtGroup = await prisma.pilotGroup.findUnique({ where: { key: "mgmt" } });
  if (salesGroup) {
    await prisma.pilotGroupMember.deleteMany({ where: { pilotGroupId: salesGroup.id } });
    await prisma.pilotGroupMember.createMany({
      data: [
        { pilotGroupId: salesGroup.id, userId: users["pilot-sales@intranet.local"] },
        { pilotGroupId: salesGroup.id, userId: users["hq@intranet.local"] },
      ],
    });
  }
  if (mgmtGroup) {
    await prisma.pilotGroupMember.deleteMany({ where: { pilotGroupId: mgmtGroup.id } });
    await prisma.pilotGroupMember.createMany({
      data: [
        { pilotGroupId: mgmtGroup.id, userId: users["pilot-mgmt@intranet.local"] },
        { pilotGroupId: mgmtGroup.id, userId: users["admin@intranet.local"] },
      ],
    });
  }
  console.log("✅ pilot group members");

  await prisma.pilotSettings.upsert({
    where: { id: "default" },
    update: { isActive: true },
    create: { id: "default", isActive: true },
  });

  const noticesBoard = await prisma.board.findUniqueOrThrow({ where: { key: "notices" } });
  const generalBoard = await prisma.board.findUniqueOrThrow({ where: { key: "general" } });
  const adminId = users["admin@intranet.local"];
  const hqId = users["hq@intranet.local"];

  const noticeTitles = [
    "[Pilot] 인트라넷 Pilot 테스트 시작",
    "[중요] 6월 정산 일정 안내",
    "하계 휴가 신청 안내",
    "사내 보안 점검 일정",
    "신규 전자결재 양식 안내",
    "대리점 교육 일정 공지",
    "AI 에이전트 Pilot 이용 안내",
    "사내 Wi-Fi 변경 안내",
    "복리후생 제도 개편",
    "Pilot 피드백 요청",
  ];

  const existingNotices = await prisma.post.count({ where: { boardId: noticesBoard.id } });
  if (existingNotices < 10) {
    await prisma.post.deleteMany({ where: { boardId: noticesBoard.id } });
    await prisma.post.createMany({
      data: noticeTitles.map((title, i) => ({
        boardId: noticesBoard.id,
        authorId: adminId,
        title,
        content: `<p>${title} — Pilot 데모 공지 ${i + 1}번째 내용입니다.</p>`,
        category: ["전사", "인사", "IT", "재무"][i % 4],
        isPinned: i === 0,
        isDemo: true,
        viewCount: 10 + i * 3,
      })),
    });
    console.log("✅ 10 notice posts");
  }

  const generalTitles = Array.from({ length: 20 }, (_, i) => `Pilot 데모 게시글 #${i + 1}`);
  const existingGeneral = await prisma.post.count({ where: { boardId: generalBoard.id } });
  if (existingGeneral < 20) {
    await prisma.post.deleteMany({ where: { boardId: generalBoard.id } });
    await prisma.post.createMany({
      data: generalTitles.map((title, i) => ({
        boardId: generalBoard.id,
        authorId: i % 2 === 0 ? hqId : adminId,
        title,
        content: `<p>일반 게시판 Pilot 데모 — ${title}</p>`,
        category: ["질문", "정보공유", "잡담"][i % 3],
        isDemo: true,
        viewCount: 5 + i,
      })),
    });
    console.log("✅ 20 general posts");
  }

  const tpl = await prisma.approvalTemplate.findFirst({ where: { key: "general" } });
  const approvalCount = await prisma.approvalDocument.count();
  if (approvalCount < 5 && tpl) {
    const statuses: ApprovalStatus[] = [
      ApprovalStatus.DRAFT,
      ApprovalStatus.IN_PROGRESS,
      ApprovalStatus.IN_PROGRESS,
      ApprovalStatus.COMPLETED,
      ApprovalStatus.REJECTED,
    ];
    for (let i = 0; i < 5; i++) {
      const doc = await prisma.approvalDocument.create({
        data: {
          title: `Pilot 데모 기안서 ${i + 1}`,
          content: tpl.content,
          status: statuses[i],
          isDemo: true,
          drafterId: hqId,
          templateId: tpl.id,
          submittedAt: i > 0 ? new Date() : null,
          completedAt: statuses[i] === ApprovalStatus.COMPLETED ? new Date() : null,
        },
      });
      if (statuses[i] !== ApprovalStatus.DRAFT) {
        await prisma.approvalStep.create({
          data: {
            documentId: doc.id,
            approverId: adminId,
            stepOrder: 1,
            status:
              statuses[i] === ApprovalStatus.COMPLETED
                ? ApprovalStepStatus.APPROVED
                : statuses[i] === ApprovalStatus.REJECTED
                  ? ApprovalStepStatus.REJECTED
                  : ApprovalStepStatus.PENDING,
            actedAt: statuses[i] !== ApprovalStatus.IN_PROGRESS ? new Date() : null,
          },
        });
      }
    }
    console.log("✅ 5 approval documents");
  }

  const ingestCount = await prisma.aiIngestJob.count();
  if (ingestCount === 0) {
    await prisma.aiIngestJob.create({
      data: {
        triggeredById: adminId,
        scope: "all",
        status: "completed",
        postsProcessed: 30,
        chunksTotal: 85,
        completedAt: new Date(),
      },
    });
    console.log("✅ AI ingest job history");
  }

  console.log("✅ demo seed complete");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
