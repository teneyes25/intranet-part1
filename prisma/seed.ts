import "./load-env";
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

import { TEMPLATE_HTML } from "./approval-template-html";

const prisma = new PrismaClient();

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL 이 없습니다. .env 또는 .env.production 에 DATABASE_URL(또는 POSTGRES_*)을 설정하세요.\n" +
        "예: DATABASE_URL=\"postgresql://intranet:비밀번호@127.0.0.1:5432/intranet?schema=public\"\n" +
        "Docker 사용 시: npm run office:db-seed",
    );
  }
  const adminPassword = await bcrypt.hash("admin1234!!", 10);
  const demoPassword = await bcrypt.hash("password1234", 10);

  const rolloutGroups = [
    { key: "group-1", name: "Rollout Group 1 (1~20)", sortOrder: 1 },
    { key: "group-2", name: "Rollout Group 2 (21~40)", sortOrder: 2 },
    { key: "group-3", name: "Rollout Group 3 (41~60)", sortOrder: 3 },
    { key: "group-4", name: "Rollout Group 4 (61~80)", sortOrder: 4 },
    { key: "group-5", name: "Rollout Group 5 (81~100)", sortOrder: 5 },
  ];
  for (const g of rolloutGroups) {
    await prisma.rolloutGroup.upsert({
      where: { key: g.key },
      update: { name: g.name, sortOrder: g.sortOrder },
      create: g,
    });
  }
  const group1 = await prisma.rolloutGroup.findUniqueOrThrow({ where: { key: "group-1" } });
  console.log("✅ rollout groups (5)");

  const dealer = await prisma.dealer.upsert({
    where: { code: "GANGNAM001" },
    update: {
      name: "강남대리점",
      region: "서울",
      rolloutActive: true,
      rolloutGroupId: group1.id,
    },
    create: {
      code: "GANGNAM001",
      name: "강남대리점",
      region: "서울",
      rolloutActive: true,
      rolloutGroupId: group1.id,
    },
  });
  console.log(`✅ seeded dealer: ${dealer.code} (${dealer.name})`);

  const seedUsers = [
    {
      email: "admin@intranet.local",
      name: "시스템 관리자",
      role: Role.ADMIN,
      dealerId: null,
    },
    // e2e·내부 테스트용 (로그인 화면에는 표시하지 않음 — 일반 사용자는 회원가입)
    {
      email: "hq@intranet.local",
      name: "본사 사용자",
      role: Role.HEADQUARTER,
      dealerId: null,
    },
    {
      email: "dealer@intranet.local",
      name: "대리점 사용자",
      role: Role.DEALER,
      dealerId: dealer.id,
    },
  ];

  let adminId = "";
  for (const u of seedUsers) {
    const email = u.email.trim().toLowerCase();
    const mustChangeOnCreate = u.role === Role.ADMIN;
    const passwordHash =
      u.role === Role.ADMIN ? adminPassword : demoPassword;
    const created = await prisma.user.upsert({
      where: { email },
      update: {
        name: u.name,
        role: u.role,
        dealerId: u.dealerId,
        passwordHash,
        isActive: true,
        approvalStatus: "APPROVED",
        // 재시드 시 초기 비밀번호로 복구 — 바로 로그인 가능
        mustChangePassword: false,
        passwordChangedAt: null,
      },
      create: {
        email,
        name: u.name,
        role: u.role,
        dealerId: u.dealerId,
        passwordHash,
        isActive: true,
        approvalStatus: "APPROVED",
        mustChangePassword: mustChangeOnCreate,
      },
    });
    if (u.role === Role.ADMIN) adminId = created.id;
    const pwHint = u.role === Role.ADMIN ? "admin1234!!" : "password1234";
    console.log(`✅ seeded user: ${email} (${u.role}) password=${pwHint}`);
  }

  // 게시판 (베이스 보드 시스템)
  const boards = [
    {
      key: "notices",
      name: "공지사항",
      description: "사내 전체 공지",
      categories: ["전사", "인사", "재무", "IT", "총무"],
      writeRoles: [Role.HEADQUARTER, Role.ADMIN],
      sortOrder: 10,
    },
    {
      key: "schedule",
      name: "일정",
      description: "사내 일정·회의·마감을 달력으로 확인합니다",
      categories: ["회의", "행사", "마감", "기타"],
      writeRoles: [],
      sortOrder: 20,
    },
    {
      key: "regulations",
      name: "사규",
      description: "사내 규정·지침·가이드라인",
      categories: ["취업규칙", "복무", "인사", "보안", "기타"],
      writeRoles: [Role.HEADQUARTER, Role.ADMIN],
      sortOrder: 30,
    },
    {
      key: "general",
      name: "일반게시판",
      description: "자유로운 소통 공간",
      categories: ["잡담", "질문", "정보공유", "동호회"],
      writeRoles: [],
      sortOrder: 40,
    },
    {
      key: "news",
      name: "뉴스",
      description: "관리자 로그인 시 하루 1회 자동 수집되는 업계 뉴스 (AI 요약·출처 포함)",
      categories: ["자동수집", "건설", "유통", "소비재", "프랜차이즈", "AI", "경제"],
      writeRoles: [Role.HEADQUARTER, Role.ADMIN],
      sortOrder: 50,
    },
    {
      key: "pr",
      name: "홍보실",
      description: "브랜드/홍보 콘텐츠",
      categories: ["보도자료", "캠페인", "이벤트"],
      writeRoles: [Role.HEADQUARTER, Role.ADMIN],
      sortOrder: 60,
    },
    {
      key: "products",
      name: "상품자료실",
      description: "상품 카탈로그 및 판매 자료",
      categories: ["카탈로그", "사양서", "가격표", "교육자료"],
      writeRoles: [Role.HEADQUARTER, Role.ADMIN],
      sortOrder: 70,
    },
  ];

  for (const b of boards) {
    const board = await prisma.board.upsert({
      where: { key: b.key },
      update: {
        name: b.name,
        description: b.description,
        categories: b.categories,
        writeRoles: b.writeRoles,
        sortOrder: b.sortOrder,
      },
      create: b,
    });
    console.log(`✅ seeded board: ${board.key} (${board.name})`);
  }

  // 전자결재 기안서 템플릿
  const templates = [
    {
      key: "general",
      name: "일반 기안서",
      description: "범용 기안 문서 양식",
      content: TEMPLATE_HTML.general,
    },
    {
      key: "expense",
      name: "지출 품의서",
      description: "비용 지출 승인을 위한 품의 양식",
      content:
        "<h2>1. 품의 제목</h2><p></p><h2>2. 지출 사유</h2><p></p><h2>3. 지출 내역</h2><ul><li>항목: </li><li>금액: </li><li>지출처: </li></ul><h2>4. 예산 과목</h2><p></p><h2>5. 첨부</h2><p>견적서/계약서 등</p>",
    },
    {
      key: "leave",
      name: "연차 유급휴가 사용신청서",
      description: "연차·반차 사용 신청 (기안문 자동 생성)",
      content:
        "<h1 style=\"text-align:center;letter-spacing:0.25em;\">연차 유급휴가 사용신청서</h1><h2>1. 신청자 정보</h2><p>소속 / 성명 / 직책(업무) / 잔여 연차 수</p><h2>2. 신청 내역</h2><p>연차 종류(연차·반차) / 시작·종료 / 사유 / 비상 연락처</p><h2>3. 결재</h2><p>담당 → 인사 → 이사</p>",
    },
    {
      key: "trip",
      name: "출장 신청서",
      description: "국내/해외 출장 신청 양식",
      content:
        "<h2>1. 출장자</h2><p></p><h2>2. 출장 기간</h2><p>____년 __월 __일 ~ ____년 __월 __일</p><h2>3. 출장지</h2><p></p><h2>4. 출장 목적</h2><p></p><h2>5. 예상 경비</h2><ul><li>교통비: </li><li>숙박비: </li><li>기타: </li></ul>",
    },
    {
      key: "budget",
      name: "예산집행품의서",
      description: "예산 과목·금액·집행 사유 품의",
      content: TEMPLATE_HTML.budget,
    },
    {
      key: "external-official",
      name: "외부공문",
      description: "대외 발송 공문 (시행 시 디지털 사용인감)",
      content: TEMPLATE_HTML.official,
    },
    {
      key: "internal-official",
      name: "내부공문",
      description: "사내 공문 (시행 시 발송자 서명)",
      content: TEMPLATE_HTML.officialInternal,
    },
    {
      key: "intake",
      name: "문서접수",
      description: "스캔 문서 접수 · 번호 FM-YYMMDD-000",
      content:
        "<h2>1. 접수 개요</h2><p>발신 기관 / 원 문서 제목 / 접수 경위</p><h2>2. 처리 요청</h2><p></p><h2>3. 첨부</h2><p>스캔 원본 파일을 첨부하세요.</p>",
    },
  ];

  for (const t of templates) {
    const tpl = await prisma.approvalTemplate.upsert({
      where: { key: t.key },
      update: { name: t.name, description: t.description, content: t.content },
      create: t,
    });
    console.log(`✅ seeded template: ${tpl.key} (${tpl.name})`);
  }

  // 상품자료실 카테고리 트리
  const catCount = await prisma.productCategory.count();
  if (catCount === 0) {
    const catalog = await prisma.productCategory.create({
      data: { boardKey: "products", name: "카탈로그", slug: "catalog", sortOrder: 1 },
    });
    await prisma.productCategory.createMany({
      data: [
        { boardKey: "products", name: "스마트폰", slug: "catalog/smartphone", parentId: catalog.id, sortOrder: 1 },
        { boardKey: "products", name: "가전", slug: "catalog/appliance", parentId: catalog.id, sortOrder: 2 },
        { boardKey: "products", name: "사양서", slug: "spec", sortOrder: 2 },
        { boardKey: "products", name: "가격표", slug: "price", sortOrder: 3 },
        { boardKey: "products", name: "교육자료", slug: "training", sortOrder: 4 },
      ],
    });
    console.log("✅ seeded product category tree");
  }

  // 문서함 카테고리
  const docCats = [
    { name: "정책", slug: "policy", description: "사내 정책·지침", workTypeCode: "정책" },
    { name: "보안", slug: "security", description: "보안·개인정보", workTypeCode: "보안" },
    { name: "운영", slug: "operations", description: "운영·업무 매뉴얼", workTypeCode: "운영" },
    { name: "전자결재", slug: "approval", description: "결재 완료 문서", workTypeCode: "전자결재" },
  ];
  for (const c of docCats) {
    await prisma.documentCategory.upsert({
      where: { slug: c.slug },
      update: {
        name: c.name,
        description: c.description,
        workTypeCode: c.workTypeCode,
      },
      create: c,
    });
  }
  console.log("✅ seeded document categories");

  // 뉴스 키워드·카테고리: 최초 1회만. 이후 배포/시드에서 삭제분을 되살리지 않음.
  const newsSeeded = await prisma.integrationSetting.findUnique({
    where: { provider: "news_defaults_seeded" },
  });
  if (newsSeeded) {
    console.log("✅ news keywords/categories kept (관리자 저장분 유지)");
  } else {
    const [kwCount, catCount] = await Promise.all([
      prisma.newsKeyword.count(),
      prisma.newsCategory.count(),
    ]);
    if (kwCount === 0) {
      const newsKeywords = [
        { keyword: "건설", category: "건설" },
        { keyword: "유통", category: "유통" },
        { keyword: "소비재", category: "소비재" },
        { keyword: "프랜차이즈", category: "프랜차이즈" },
        { keyword: "AI 인공지능", category: "AI" },
        { keyword: "경제", category: "경제" },
        { keyword: "미래 기술", category: "미래" },
      ];
      await prisma.newsKeyword.createMany({
        data: newsKeywords.map((kw, i) => ({ ...kw, sortOrder: i })),
      });
      console.log("✅ seeded news keywords (first run)");
    } else {
      console.log("✅ news keywords already present — skip recreate");
    }
    if (catCount === 0) {
      const defaultNewsCats = [
        "건설",
        "유통",
        "소비재",
        "프랜차이즈",
        "AI",
        "경제",
        "미래",
      ];
      await prisma.newsCategory.createMany({
        data: defaultNewsCats.map((name, i) => ({
          name,
          sortOrder: (i + 1) * 10,
        })),
      });
      console.log("✅ seeded news categories (first run)");
    } else {
      console.log("✅ news categories already present — skip recreate");
    }
    await prisma.integrationSetting.upsert({
      where: { provider: "news_defaults_seeded" },
      create: {
        provider: "news_defaults_seeded",
        displayName: "뉴스 기본 키워드 시드 완료",
        isEnabled: true,
        metadata: { seededAt: new Date().toISOString() },
      },
      update: {},
    });
  }

  // 업무 카테고리
  const defaultJobs = [
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
  ];
  for (const [i, name] of defaultJobs.entries()) {
    await prisma.jobCategory.upsert({
      where: { name },
      update: {},
      create: { name, sortOrder: (i + 1) * 10 },
    });
  }
  console.log("✅ seeded job categories");

  // 문서함 샘플
  const cats = await prisma.documentCategory.findMany();
  const catByName = Object.fromEntries(cats.map((c) => [c.name, c.id]));

  const docCount = await prisma.sharedDocument.count();
  if (docCount === 0) {
    await prisma.sharedDocument.createMany({
      data: [
        {
          title: "행정안전부 공문 작성 지침",
          description: "전자결재 기안 시 참고하는 공문 작성 기준 자료",
          category: "정책",
          documentCategoryId: catByName["정책"] ?? null,
          url: "https://www.mois.go.kr",
          tags: ["행정", "공문", "결재"],
        },
        {
          title: "사내 보안 정책 안내",
          description: "정보 보안 및 개인정보 처리 지침",
          category: "보안",
          documentCategoryId: catByName["보안"] ?? null,
          tags: ["보안", "정책"],
        },
        {
          title: "대리점 운영 매뉴얼",
          description: "대리점 일일 업무 및 보고 절차",
          category: "운영",
          documentCategoryId: catByName["운영"] ?? null,
          tags: ["대리점", "매뉴얼"],
        },
      ],
    });
    console.log("✅ seeded shared documents (category FK linked)");
  } else {
    // 기존 레거시 category 문자열 → FK 연결
    for (const [name, id] of Object.entries(catByName)) {
      await prisma.sharedDocument.updateMany({
        where: { documentCategoryId: null, category: name },
        data: { documentCategoryId: id },
      });
    }
    console.log("✅ backfilled shared document categories");
  }

  // 연차 잔여 (시드 사용자) — 클라이언트 미생성 시 스킵 안내
  const leaveDelegate = (
    prisma as unknown as {
      leaveBalance?: {
        upsert: (args: unknown) => Promise<unknown>;
      };
    }
  ).leaveBalance;

  if (!leaveDelegate?.upsert) {
    console.warn(
      "⚠️ leaveBalance 모델이 Prisma Client에 없습니다. 호스트에서 실행: npx prisma generate",
    );
  } else {
    const leaveYear = new Date().getFullYear();
    for (const email of [
      "admin@intranet.local",
      "hq@intranet.local",
      "dealer@intranet.local",
    ]) {
      const u = await prisma.user.findUnique({ where: { email } });
      if (!u) continue;
      await leaveDelegate.upsert({
        where: { userId_year: { userId: u.id, year: leaveYear } },
        update: {},
        create: {
          userId: u.id,
          year: leaveYear,
          accruedDays: 15,
          usedDays: email === "hq@intranet.local" ? 3 : 0,
        },
      });
    }
    console.log("✅ seeded leave balances");
  }
  // 샘플 게시글 (공지사항)
  if (adminId) {
    const notices = await prisma.board.findUniqueOrThrow({
      where: { key: "notices" },
    });
    const existing = await prisma.post.count({ where: { boardId: notices.id } });
    if (existing === 0) {
      await prisma.post.createMany({
        data: [
          {
            boardId: notices.id,
            authorId: adminId,
            title: "[중요] 6월 정산 일정 안내",
            content:
              "<p>6월 정산 마감은 <strong>6월 25일</strong>까지입니다. 기한 내 제출 바랍니다.</p>",
            category: "재무",
            isPinned: true,
            viewCount: 42,
          },
          {
            boardId: notices.id,
            authorId: adminId,
            title: "하계 휴가 신청 안내",
            content: "<p>하계 휴가 신청은 인사 시스템에서 진행해 주세요.</p>",
            category: "인사",
            viewCount: 18,
          },
        ],
      });
      console.log("✅ seeded sample notices posts");
    }
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
