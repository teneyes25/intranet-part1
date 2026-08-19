import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("password1234", 10);

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
    const mustChangeOnCreate = u.role === Role.ADMIN;
    const created = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        role: u.role,
        dealerId: u.dealerId,
        passwordHash: password,
        isActive: true,
        approvalStatus: "APPROVED",
        mustChangePassword: false,
      },
      create: {
        email: u.email,
        name: u.name,
        role: u.role,
        dealerId: u.dealerId,
        passwordHash: password,
        isActive: true,
        approvalStatus: "APPROVED",
        mustChangePassword: mustChangeOnCreate,
      },
    });
    if (u.role === Role.ADMIN) adminId = created.id;
    console.log(`✅ seeded user: ${u.email} (${u.role})`);
  }

  // 게시판 (베이스 보드 시스템)
  const boards = [
    {
      key: "notices",
      name: "공지사항",
      description: "사내 전체 공지",
      categories: ["전사", "인사", "재무", "IT", "총무"],
      writeRoles: [Role.HEADQUARTER, Role.ADMIN],
    },
    {
      key: "general",
      name: "일반게시판",
      description: "자유로운 소통 공간",
      categories: ["잡담", "질문", "정보공유", "동호회"],
      writeRoles: [],
    },
    {
      key: "news",
      name: "뉴스",
      description: "매일 자동 수집되는 업계 뉴스 (AI 요약·출처 포함)",
      categories: ["자동수집", "건설", "유통", "소비재", "프랜차이즈", "AI", "경제"],
      writeRoles: [Role.HEADQUARTER, Role.ADMIN],
    },
    {
      key: "pr",
      name: "홍보실",
      description: "브랜드/홍보 콘텐츠",
      categories: ["보도자료", "캠페인", "이벤트"],
      writeRoles: [Role.HEADQUARTER, Role.ADMIN],
    },
    {
      key: "products",
      name: "상품자료실",
      description: "상품 카탈로그 및 판매 자료",
      categories: ["카탈로그", "사양서", "가격표", "교육자료"],
      writeRoles: [Role.HEADQUARTER, Role.ADMIN],
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
      content:
        "<h2>1. 제목</h2><p></p><h2>2. 기안 목적</h2><p></p><h2>3. 주요 내용</h2><ul><li></li></ul><h2>4. 기대 효과</h2><p></p><h2>5. 협조 사항</h2><p></p>",
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
      name: "휴가 신청서",
      description: "연차/병가 등 휴가 신청 양식",
      content:
        "<h2>1. 신청인</h2><p></p><h2>2. 휴가 종류</h2><p>연차 / 병가 / 경조사 / 기타</p><h2>3. 휴가 기간</h2><p>____년 __월 __일 ~ ____년 __월 __일 (총 __일)</p><h2>4. 사유</h2><p></p><h2>5. 업무 인수인계</h2><p></p>",
    },
    {
      key: "trip",
      name: "출장 신청서",
      description: "국내/해외 출장 신청 양식",
      content:
        "<h2>1. 출장자</h2><p></p><h2>2. 출장 기간</h2><p>____년 __월 __일 ~ ____년 __월 __일</p><h2>3. 출장지</h2><p></p><h2>4. 출장 목적</h2><p></p><h2>5. 예상 경비</h2><ul><li>교통비: </li><li>숙박비: </li><li>기타: </li></ul>",
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
    { name: "정책", slug: "policy", description: "사내 정책·지침" },
    { name: "보안", slug: "security", description: "보안·개인정보" },
    { name: "운영", slug: "operations", description: "운영·업무 매뉴얼" },
    { name: "전자결재", slug: "approval", description: "결재 완료 문서" },
  ];
  for (const c of docCats) {
    await prisma.documentCategory.upsert({
      where: { slug: c.slug },
      update: { name: c.name, description: c.description },
      create: c,
    });
  }
  console.log("✅ seeded document categories");

  // 뉴스 키워드 (업종·분야)
  const newsKeywords = [
    { keyword: "건설", category: "건설" },
    { keyword: "유통", category: "유통" },
    { keyword: "소비재", category: "소비재" },
    { keyword: "프랜차이즈", category: "프랜차이즈" },
    { keyword: "AI 인공지능", category: "AI" },
    { keyword: "경제", category: "경제" },
    { keyword: "미래 기술", category: "미래" },
  ];
  for (const [i, kw] of newsKeywords.entries()) {
    await prisma.newsKeyword.upsert({
      where: { keyword: kw.keyword },
      update: { category: kw.category, isActive: true, sortOrder: i },
      create: { ...kw, sortOrder: i },
    });
  }
  console.log("✅ seeded news keywords");

  // 문서함 샘플
  const docCount = await prisma.sharedDocument.count();
  if (docCount === 0) {
    await prisma.sharedDocument.createMany({
      data: [
        {
          title: "행정안전부 공문 작성 지침",
          description: "전자결재 기안 시 참고하는 공문 작성 기준 자료",
          category: "정책",
          url: "https://www.mois.go.kr",
          tags: ["행정", "공문", "결재"],
        },
        {
          title: "사내 보안 정책 안내",
          description: "정보 보안 및 개인정보 처리 지침",
          category: "보안",
          tags: ["보안", "정책"],
        },
        {
          title: "대리점 운영 매뉴얼",
          description: "대리점 일일 업무 및 보고 절차",
          category: "운영",
          tags: ["대리점", "매뉴얼"],
        },
      ],
    });
    console.log("✅ seeded shared documents");
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
