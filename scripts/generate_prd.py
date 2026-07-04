# -*- coding: utf-8 -*-
"""Ten Eyes Intranet Part 1 — PRD v1.2.1 Final (.docx) generator."""

from pathlib import Path

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_LINE_SPACING, WD_TAB_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor

OUT = (
    Path(__file__).resolve().parents[1]
    / "docs"
    / "Ten_Eyes_Intranet_Part1_PRD_v1.2.1_Final.docx"
)

NAVY = RGBColor(0x0F, 0x17, 0x2A)
BLUE = RGBColor(0x25, 0x63, 0xEB)
GRAY = RGBColor(0x33, 0x41, 0x55)
MUTED = RGBColor(0x64, 0x74, 0x8B)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)


def set_run_font(run, size=11, bold=False, color=None, name="맑은 고딕"):
    run.font.name = name
    run._element.rPr.rFonts.set(qn("w:eastAsia"), name)
    run.font.size = Pt(size)
    run.bold = bold
    if color:
        run.font.color.rgb = color


def add_heading_styled(doc, text, level=1):
    p = doc.add_heading(text, level=level)
    for run in p.runs:
        set_run_font(
            run,
            size={1: 16, 2: 13, 3: 11}.get(level, 11),
            bold=True,
            color=NAVY,
        )
    p.paragraph_format.space_before = Pt(14 if level == 1 else 10)
    p.paragraph_format.space_after = Pt(8)
    return p


def add_para(doc, text, size=11, bold=False, color=GRAY, space_after=8, align=None):
    p = doc.add_paragraph()
    run = p.add_run(text)
    set_run_font(run, size=size, bold=bold, color=color)
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.line_spacing = 1.15
    if align:
        p.alignment = align
    return p


def add_bullet(doc, text, level=0):
    p = doc.add_paragraph(style="List Bullet")
    p.clear()
    run = p.add_run(text)
    set_run_font(run, size=10.5, color=GRAY)
    p.paragraph_format.left_indent = Cm(0.4 + level * 0.4)
    p.paragraph_format.space_after = Pt(3)
    p.paragraph_format.line_spacing = 1.1
    return p


def add_screenshot_block(doc, shot_id, title, path, account, steps, notes):
    """Concrete screenshot placeholder with capture instructions."""
    box = doc.add_paragraph()
    box.paragraph_format.space_before = Pt(10)
    box.paragraph_format.space_after = Pt(2)
    r = box.add_run(f"■ 스크린샷 {shot_id}: {title}")
    set_run_font(r, size=10.5, bold=True, color=NAVY)

    add_para(doc, f"경로: {path}", size=9.5, color=MUTED, space_after=2)
    add_para(doc, f"계정: {account}", size=9.5, color=MUTED, space_after=2)

    add_para(doc, "캡처 지시", size=9.5, bold=True, color=NAVY, space_after=2)
    for i, step in enumerate(steps, 1):
        add_para(doc, f"  {i}. {step}", size=9.5, color=GRAY, space_after=1)

    if notes:
        add_para(doc, f"비고: {notes}", size=9, color=MUTED, space_after=4)

    ph = doc.add_paragraph()
    ph.alignment = WD_ALIGN_PARAGRAPH.CENTER
    ph.paragraph_format.space_before = Pt(4)
    ph.paragraph_format.space_after = Pt(10)
    run = ph.add_run(
        f"[ 이미지 삽입 영역 — {shot_id} ]\n"
        "권장: 1920×1080 또는 모바일 390×844 · PNG · 개인정보·데모 비밀번호 마스킹"
    )
    set_run_font(run, size=9, color=MUTED, bold=True)


def set_cell_text(cell, text, bold=False, size=9.5, color=GRAY):
    cell.text = ""
    p = cell.paragraphs[0]
    run = p.add_run(text)
    set_run_font(run, size=size, bold=bold, color=color)


def shade_header_row(row):
    for cell in row.cells:
        tcPr = cell._tc.get_or_add_tcPr()
        shd = OxmlElement("w:shd")
        shd.set(qn("w:val"), "clear")
        shd.set(qn("w:color"), "auto")
        shd.set(qn("w:fill"), "0F172A")
        tcPr.append(shd)
        for p in cell.paragraphs:
            for run in p.runs:
                run.font.color.rgb = WHITE
                run.bold = True


def add_table(doc, headers, rows):
    table = doc.add_table(rows=1 + len(rows), cols=len(headers))
    table.style = "Table Grid"
    for i, h in enumerate(headers):
        set_cell_text(table.rows[0].cells[i], h, bold=True, size=9.5, color=WHITE)
    shade_header_row(table.rows[0])
    for r_idx, row in enumerate(rows):
        for c_idx, val in enumerate(row):
            set_cell_text(table.rows[r_idx + 1].cells[c_idx], val, size=9.5)
    doc.add_paragraph()
    return table


def add_page_number(paragraph):
    run = paragraph.add_run()
    fld_char_begin = OxmlElement("w:fldChar")
    fld_char_begin.set(qn("w:fldCharType"), "begin")
    instr = OxmlElement("w:instrText")
    instr.set(qn("xml:space"), "preserve")
    instr.text = " PAGE "
    fld_char_end = OxmlElement("w:fldChar")
    fld_char_end.set(qn("w:fldCharType"), "end")
    run._r.append(fld_char_begin)
    run._r.append(instr)
    run._r.append(fld_char_end)


def setup_section(section):
    section.top_margin = Cm(2.0)
    section.bottom_margin = Cm(2.0)
    section.left_margin = Cm(2.4)
    section.right_margin = Cm(2.4)
    section.page_width = Cm(21.0)
    section.page_height = Cm(29.7)

    header = section.header
    header.is_linked_to_previous = False
    hp = header.paragraphs[0]
    hp.clear()
    r = hp.add_run("Ten Eyes Intranet Part 1  ·  PRD v1.2.1 Final")
    set_run_font(r, size=8.5, color=MUTED)
    hp.alignment = WD_ALIGN_PARAGRAPH.RIGHT

    footer = section.footer
    footer.is_linked_to_previous = False
    fp = footer.paragraphs[0]
    fp.clear()
    r1 = fp.add_run("Confidential  ·  Internal Use Only  ·  ")
    set_run_font(r1, size=8.5, color=MUTED)
    add_page_number(fp)
    r2 = fp.add_run(" 페이지")
    set_run_font(r2, size=8.5, color=MUTED)
    fp.alignment = WD_ALIGN_PARAGRAPH.CENTER


def build():
    doc = Document()
    setup_section(doc.sections[0])

    # ========== COVER ==========
    for _ in range(2):
        doc.add_paragraph()

    title = doc.add_paragraph()
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = title.add_run("Ten Eyes Intranet Part 1")
    set_run_font(r, size=26, bold=True, color=NAVY)

    subtitle = doc.add_paragraph()
    subtitle.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = subtitle.add_run("Product Requirements Document")
    set_run_font(r, size=16, bold=True, color=BLUE)

    ver = doc.add_paragraph()
    ver.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = ver.add_run("PRD v1.2.1 Final  ·  2026년 7월")
    set_run_font(r, size=12, color=GRAY)

    doc.add_paragraph()
    for line in [
        "프로젝트명: Ten Eyes Intranet (인트라넷 Part 1)",
        "목적: 본사 및 전국 약 100개 대리점의 업무 효율화·협업 강화",
        "배포: Docker + Nginx 온프레미스 (포트 8080)",
        "제품 상태: Phase 5 상용화 MVP · Frontend UX/UI Phase 1 (Design System v5)",
        "문서 분류: 제품 요구사항 정의서 (내부용 · Confidential)",
    ]:
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = p.add_run(line)
        set_run_font(r, size=10.5, color=GRAY)

    doc.add_page_break()

    # ========== TOC ==========
    add_heading_styled(doc, "목차", 1)
    toc_items = [
        ("1.", "프로젝트 개요"),
        ("2.", "프로젝트 배경 및 목표"),
        ("3.", "주요 기능"),
        ("4.", "기능 상세 설명 (스크린샷 가이드 포함)"),
        ("5.", "사용자 역할 및 권한"),
        ("6.", "비기능 요구사항"),
        ("7.", "기술 스택 다이어그램"),
        ("8.", "배포 및 운영"),
        ("9.", "Risks & Assumptions"),
        ("10.", "향후 개발 로드맵 (Part 2)"),
        ("11.", "배포 및 유지보수 가이드 요약"),
        ("12.", "문서 변경 이력"),
        ("13.", "부록 — 문서 맵 및 용어"),
    ]
    for num, label in toc_items:
        p = doc.add_paragraph()
        p.paragraph_format.space_after = Pt(5)
        p.paragraph_format.tab_stops.add_tab_stop(Cm(15.5), WD_TAB_ALIGNMENT.RIGHT)
        r = p.add_run(f"{num}  {label}")
        set_run_font(r, size=11, color=GRAY)
    add_para(
        doc,
        "※ Word에서 목차 필드 자동 갱신이 필요하면 제목 스타일(Heading 1/2)을 기준으로 "
        "참조 → 목차 기능을 사용할 수 있습니다. 본 문서는 Heading 스타일을 사용합니다.",
        size=9,
        color=MUTED,
    )
    doc.add_page_break()

    # ========== 1 ==========
    add_heading_styled(doc, "1. 프로젝트 개요", 1)
    add_heading_styled(doc, "1.1 기본 정보", 2)
    add_table(
        doc,
        ["항목", "내용"],
        [
            ["프로젝트명", "Ten Eyes Intranet (인트라넷 Part 1)"],
            ["PRD 버전", "v1.2.1 Final"],
            ["제품 버전", "v1.3.0 (Frontend UX/UI Phase 1 포함)"],
            ["개발 기간", "Day 1 ~ Day 36+ (Phase 1~5) · Frontend Phase 1"],
            ["배포 형태", "Docker Compose + Nginx 온프레미스 (HTTP :8080)"],
            ["대상 조직", "본사 + 전국 약 100개 대리점"],
            ["데이터 계층", "PostgreSQL + Prisma (Firebase는 선택 활성화)"],
            ["UI 체계", "Design System v5 (Navy / Blue / Slate · Pretendard)"],
        ],
    )

    add_heading_styled(doc, "1.2 제품 정의", 2)
    add_para(
        doc,
        "Ten Eyes Intranet Part 1은 본사와 전국 대리점이 단일 웹 포털에서 공지·자료·"
        "AI 지원·페이지 커스터마이징을 수행하고, Part 2 B2B 거래 기능을 안전하게 "
        "확장할 수 있도록 설계된 온프레미스 인트라넷 플랫폼입니다.",
    )

    add_heading_styled(doc, "1.3 범위", 2)
    add_para(doc, "In Scope (Part 1)", bold=True, color=NAVY)
    for t in [
        "인증·RBAC·감사 로그 기반 인트라넷 코어",
        "게시판(공지, 일정, 업계 뉴스, 홍보실, 상품자료실) 및 매장 찾기",
        "AI Agent(RAG), 알림, 대리점 포털, Design System v5 UI",
        "GrapesJS Page Builder(본사/대리점 Self-Service)",
        "회사 테마, Docker 배포·운영 문서",
        "Firebase 하이브리드 코드 준비(기본 FIREBASE_ENABLED=false)",
    ]:
        add_bullet(doc, t)

    add_para(doc, "Out of Scope (Part 2 이후)", bold=True, color=NAVY)
    for t in [
        "실거래 발주·세금계산서·카드결제·전자계약(현재 플레이스홀더 블록만)",
        "대리점 간 물품 거래·재고 실운영 모듈",
        "PG 연동, 전자계약 서비스 연동",
        "Firebase Console 실서비스 설정(배포 후 선택)",
    ]:
        add_bullet(doc, t)

    # ========== 2 ==========
    add_heading_styled(doc, "2. 프로젝트 배경 및 목표", 1)
    add_heading_styled(doc, "2.1 배경", 2)
    add_para(
        doc,
        "전국 대리점 네트워크에서는 공지·상품 자료·홍보 콘텐츠가 채널별로 분산되기 "
        "쉽고, 대리점별 브랜딩·레이아웃 요청이 본사 IT에 집중되는 병목이 발생합니다. "
        "업계 뉴스와 사내 자료를 빠르게 검색·요약하는 AI 지원, 그리고 향후 B2B 거래"
        "(발주·결제·계약)로 확장 가능한 단일 플랫폼이 필요합니다.",
    )
    add_para(
        doc,
        "Part 1은 PostgreSQL 중심의 안정적인 온프레미스 인트라넷을 먼저 상용화하고, "
        "Page Builder로 대리점 Self-Service를 제공하며, Firebase·거래 모듈은 "
        "하이브리드/플레이스홀더로 준비하여 단계적 확장을 가능하게 합니다.",
    )

    add_heading_styled(doc, "2.2 목표", 2)
    add_table(
        doc,
        ["목표", "설명"],
        [
            ["업무 효율화", "공지·자료·일정·뉴스를 단일 포털에서 조회·검색·공유"],
            ["협업 강화", "본사–대리점 역할 기반 접근과 감사 로그로 투명한 운영"],
            ["Self-Service", "대리점이 자사 레이아웃·브랜딩을 직접 편집(Page Builder)"],
            ["AI 지원", "인트라넷 자료 RAG + 업계 뉴스 자동 수집"],
            ["온프레미스 상용화", "Docker·Nginx·체크리스트 기반 본사 서버 배포"],
            ["확장 준비", "Part 2 API(/api/v2) 및 Firebase 선택 활성화"],
            ["Modern Corporate UX", "Design System v5 · Mobile First · 주요 화면 폴리싱"],
        ],
    )

    add_heading_styled(doc, "2.3 성공 기준 (MVP)", 2)
    add_para(doc, "기술·기능 기준", bold=True, color=NAVY)
    for t in [
        "Credentials 로그인 및 ADMIN / HEADQUARTER / DEALER RBAC 정상 동작",
        "상용 게시판 메뉴(공지·일정·업계 뉴스·홍보실·상품자료실·매장 찾기) 제공",
        "Page Builder: ADMIN 저장, HQ read-only, DEALER 자사 scope 잠금",
        "FIREBASE_ENABLED=false 상태에서 PostgreSQL·로컬 업로드만으로 운영 가능",
        "production-check / smoke / typecheck / lint 통과",
        "본사 배포 체크리스트(HQ_DEPLOYMENT_FINAL_CHECKLIST) 문서화 완료",
        "Design System v5 적용 및 Mobile First 레이아웃 적용",
    ]:
        add_bullet(doc, t)

    add_para(doc, "비즈니스 KPI (Pilot 4~8주 기준 목표)", bold=True, color=NAVY)
    add_table(
        doc,
        ["KPI", "정의", "목표(Pilot)"],
        [
            ["주간 활성 대리점 비율", "주 1회 이상 로그인한 대리점 / 전체 Pilot 대리점", "≥ 70%"],
            ["공지 도달·확인", "중요 공지 게시 후 7일 내 대리점 조회율", "≥ 80%"],
            ["Page Builder 자립도", "대리점이 IT 요청 없이 자사 레이아웃을 저장한 비율", "≥ 50%"],
            ["AI Agent 활용", "주간 활성 사용자 중 AI 질문 1회 이상 비율", "≥ 30%"],
            ["IT 티켓 감소", "레이아웃·브랜딩 관련 본사 IT 요청 건수(전월 대비)", "≥ 40% 감소"],
            ["장애·롤백", "배포 후 7일 내 P1 장애 또는 전체 롤백", "0건"],
            ["교육 완료", "Pilot 대리점 관리자 온보딩(가이드·실습) 이수율", "100%"],
        ],
    )

    # ========== 3 ==========
    add_heading_styled(doc, "3. 주요 기능", 1)
    add_heading_styled(doc, "3.1 핵심 인트라넷 기능", 2)
    add_para(doc, "인증 및 접근 제어", bold=True, color=NAVY)
    for t in [
        "회원가입 / 로그인: NextAuth Credentials(이메일·비밀번호)",
        "Google 로그인: Firebase Auth 연동(FIREBASE_ENABLED=true 시)",
        "RBAC: ADMIN, HEADQUARTER, DEALER",
    ]:
        add_bullet(doc, t)

    add_para(doc, "게시판 및 콘텐츠", bold=True, color=NAVY)
    for t in [
        "공지사항, 일정, 업계 뉴스, 홍보실, 상품 자료실 — CRUD·검색·첨부",
        "메일함 스타일 뷰(DnD 폴더) 및 매장 찾기",
        "업계 뉴스 자동 수집(매일 09:00 KST)",
    ]:
        add_bullet(doc, t)

    add_para(doc, "AI Agent · 업무 · 운영", bold=True, color=NAVY)
    for t in [
        "RAG Q&A(pgvector + FTS), 마크다운 답변, 출처, 텍스트 파일 첨부",
        "전자결재·근태·문서함(메뉴 토글로 단계적 공개)",
        "대리점 포털, 거래 모듈 Preview, 관리자 모니터링·감사 로그",
    ]:
        add_bullet(doc, t)

    add_heading_styled(doc, "3.2 Page Builder", 2)
    add_para(
        doc,
        "GrapesJS 기반 Visual Page Builder는 상용화 핵심 차별화 기능입니다. "
        "편집 흐름(페이지·범위 선택 → 템플릿 미리보기/적용 → 블록 편집·기기 미리보기 → 저장)을 "
        "UI에 명시하여 사용성을 상용 수준으로 끌어올렸습니다.",
    )
    for t in [
        "ADMIN: global + 전 대리점 저장 / DEALER: 자사 scope / HQ: read-only",
        "템플릿 갤러리, Undo/Redo, 버전 관리(최대 3), 모바일·태블릿·데스크톱 미리보기",
        "Slug: dashboard, banner, board:{key}, post-detail:{boardKey|postId}",
    ]:
        add_bullet(doc, t)

    add_heading_styled(doc, "3.3 기술 스택", 2)
    add_table(
        doc,
        ["계층", "기술"],
        [
            ["Frontend", "Next.js 15, TypeScript, TailwindCSS, shadcn/ui, Pretendard"],
            ["Backend", "Next.js API Routes, Middleware RBAC"],
            ["Database", "PostgreSQL + Prisma, pgvector"],
            ["AI", "OpenAI + Hybrid Search (RAG)"],
            ["Page Builder", "GrapesJS"],
            ["Auth", "NextAuth.js + (선택) Firebase Auth"],
            ["Container", "Docker Compose + Nginx (:8080)"],
        ],
    )

    # ========== 4 ==========
    add_heading_styled(doc, "4. 기능 상세 설명", 1)
    add_para(
        doc,
        "각 기능별 요구사항과 함께, 문서·데모용 스크린샷을 삽입할 위치와 캡처 절차를 "
        "명시합니다. 캡처 시 데모 비밀번호·실명·개인정보는 마스킹합니다.",
    )

    add_heading_styled(doc, "4.1 로그인 및 인증", 2)
    for t in [
        "Credentials 로그인(기본 운영 경로), NextAuth JWT 세션",
        "FIREBASE_ENABLED=true 시 Google 로그인 버튼 노출",
    ]:
        add_bullet(doc, t)
    add_screenshot_block(
        doc,
        "S-01",
        "로그인 화면(AuthShell)",
        "/login",
        "비로그인 상태",
        [
            "시크릿/프라이빗 창에서 /login 접속",
            "좌측 브랜드 패널·우측 로그인 폼이 보이도록 데스크톱(≥1280px) 캡처",
            "모바일(390px) 추가 캡처 권장 — 단일 컬럼 레이아웃 확인",
            "Google 버튼은 FIREBASE_ENABLED=false 시 미표시 상태 유지",
        ],
        "데모 계정 힌트가 보이면 비밀번호 영역은 가림",
    )

    add_heading_styled(doc, "4.2 대시보드", 2)
    for t in [
        "PageHero 또는 회사 테마 히어로, KPI strip(2×2 모바일 / 4열 데스크톱)",
        "최근 게시글·AI 요약·기능 바로가기 위젯",
    ]:
        add_bullet(doc, t)
    add_screenshot_block(
        doc,
        "S-02",
        "대시보드 홈",
        "/dashboard",
        "admin@intranet.local",
        [
            "로그인 후 /dashboard 진입",
            "히어로·KPI·최근 게시글이 한 화면에 들어오도록 스크롤 위치 조정",
            "사이드바 펼침 상태(데스크톱)와 접힘/모바일 드로어 각각 1장",
        ],
        "회사 테마(French Maison) 적용 시 테마 히어로가 보이도록 캡처",
    )

    add_heading_styled(doc, "4.3 게시판", 2)
    for t in [
        "목록·상세·작성, 검색·첨부, 메일함(DnD) 뷰",
        "board / post-detail 레이아웃 커스터마이징",
    ]:
        add_bullet(doc, t)
    add_screenshot_block(
        doc,
        "S-03",
        "게시판 목록",
        "/boards/notices",
        "hq@intranet.local",
        [
            "공지사항 목록에서 핀·작성자·날짜 컬럼이 보이도록 캡처",
            "「메일함 보기」 버튼이 헤더 액션에 노출된 상태 포함",
        ],
        None,
    )
    add_screenshot_block(
        doc,
        "S-04",
        "메일함 스타일 뷰",
        "/boards/notices/mailbox",
        "hq@intranet.local",
        [
            "좌측 폴더·우측 목록이 보이도록 캡처",
            "가능하면 게시글 1건을 폴더로 드래그하는 순간(또는 폴더 hover) 캡처",
        ],
        "DnD가 어려우면 폴더 선택 후 목록만 캡처",
    )

    add_heading_styled(doc, "4.4 AI 에이전트", 2)
    for t in [
        "마크다운 답변, 출처 카드, 텍스트 파일 첨부, 지식 동기화(ADMIN)",
    ]:
        add_bullet(doc, t)
    add_screenshot_block(
        doc,
        "S-05",
        "AI Agent 채팅",
        "/ai-agent",
        "admin@intranet.local",
        [
            "샘플 질문(예: 공지사항 핵심 내용) 전송 후 답변·출처가 표시된 상태 캡처",
            "하단 composer(첨부·입력·전송)와 상단 동기화 버튼 포함",
            "모바일 높이(dvh)에서 입력창이 잘리지 않는지 확인 후 캡처",
        ],
        "출처 URL·내부 문서 제목에 민감정보가 있으면 마스킹",
    )

    add_heading_styled(doc, "4.5 Page Builder", 2)
    for t in [
        "편집 흐름 힌트, 템플릿 갤러리(미리보기 → 적용 후 저장), 기기 미리보기",
    ]:
        add_bullet(doc, t)
    add_screenshot_block(
        doc,
        "S-06",
        "Visual Page Builder",
        "/admin/customize/page-builder",
        "admin@intranet.local",
        [
            "편집 흐름 힌트 바가 상단에 보이도록 캡처",
            "템플릿 갤러리 Sheet를 연 상태에서 「미리보기」「적용 후 저장」 버튼 포함",
            "캔버스에 블록이 배치된 상태 + 데스크톱/모바일 디바이스 전환 각 1장",
        ],
        "HQ 계정으로 read-only 배너(S-06b) 추가 캡처 권장",
    )

    add_heading_styled(doc, "4.6 대리점 포털", 2)
    for t in ["KPI, 빠른 작업, 주문 테이블, 페이지 편집 진입"]:
        add_bullet(doc, t)
    add_screenshot_block(
        doc,
        "S-07",
        "대리점 포털",
        "/dealer-portal",
        "dealer@intranet.local",
        [
            "히어로·KPI·빠른 작업 그리드가 보이도록 캡처",
            "「페이지 편집」 카드가 포함된 상태 유지",
        ],
        None,
    )

    add_heading_styled(doc, "4.7 전자결재 기안", 2)
    for t in ["양식 선택 → 본문 → 결재선, AI 지원 기안"]:
        add_bullet(doc, t)
    add_screenshot_block(
        doc,
        "S-08",
        "새 기안 화면",
        "/approval/new",
        "hq@intranet.local",
        [
            "기안서 작성 카드 헤더(양식 선택 → 본문 → 결재선)가 보이도록 캡처",
            "양식 드롭다운 또는 본문 에디터가 일부 채워진 상태 권장",
        ],
        "메뉴가 숨김(nav-modules)인 경우 URL 직접 접속",
    )

    add_heading_styled(doc, "4.8 공통 셸 (Sidebar · Topbar · 알림)", 2)
    add_screenshot_block(
        doc,
        "S-09",
        "Topbar 알림 패널",
        "/dashboard (알림 벨 클릭)",
        "admin@intranet.local",
        [
            "알림 벨 클릭 후 드롭다운이 열린 상태 캡처",
            "읽지 않은 항목이 있으면 unread 스타일이 보이도록 준비",
        ],
        "알림이 없으면 빈 상태 UI도 유효한 캡처",
    )

    # ========== 5 ==========
    add_heading_styled(doc, "5. 사용자 역할 및 권한", 1)
    add_table(
        doc,
        ["역할", "설명", "Page Builder"],
        [
            ["ADMIN", "전체 관리·브랜딩·모니터링", "global + 전 대리점 저장"],
            ["HEADQUARTER", "본사 사용자", "미리보기 전용(저장 차단)"],
            ["DEALER", "대리점 사용자", "자사 dealerId만 저장"],
        ],
    )
    add_table(
        doc,
        ["기능", "ADMIN", "HQ", "DEALER"],
        [
            ["대시보드·게시판", "O", "O", "O"],
            ["대리점 포털", "O", "—", "O"],
            ["AI 에이전트", "O", "O", "O"],
            ["관리자 메뉴", "O", "—", "—"],
            ["Page Builder 저장", "O", "X", "자사만"],
        ],
    )

    # ========== 6 ==========
    add_heading_styled(doc, "6. 비기능 요구사항", 1)
    add_heading_styled(doc, "6.1 보안", 2)
    for t in [
        "RBAC, Rate Limiting, CSP, Audit Log, HTML sanitize",
        "시크릿은 .env.production(git 제외), DB/Redis 포트 외부 차단",
    ]:
        add_bullet(doc, t)
    add_heading_styled(doc, "6.2 성능·가용성", 2)
    for t in [
        "Next.js standalone Docker, Redis 캐시, health/smoke/load-test",
        "백업: pg_dump + uploads 볼륨, 모니터링 /admin/monitoring",
    ]:
        add_bullet(doc, t)
    add_heading_styled(doc, "6.3 UX·접근성", 2)
    for t in [
        "Mobile First, touch-target, safe-area, focus-visible",
        "Pretendard 기반 타이포, Design System v5 토큰 일관성",
    ]:
        add_bullet(doc, t)

    # ========== 7 ==========
    add_heading_styled(doc, "7. 기술 스택 다이어그램", 1)
    diagram = """
[브라우저 / 모바일]
        │
        ▼
 [Nginx :8080]
        │
        ▼
┌─────────────────────────────────┐
│  Next.js 15 (App Router · API)  │
│  Middleware RBAC · AI · PB API  │
└─────────────────────────────────┘
   │           │           │
   ▼           ▼           ▼
PostgreSQL   Redis    uploads/
+ pgvector
   │
   └── (선택) Firebase Auth / Storage / Firestore / FCM
"""
    p = doc.add_paragraph()
    run = p.add_run(diagram.strip("\n"))
    set_run_font(run, size=9, name="Consolas", color=NAVY)
    add_para(
        doc,
        "상세 Mermaid: docs/ARCHITECTURE.md · Firebase: docs/FIREBASE_HYBRID.md",
        size=9,
        color=MUTED,
    )

    # ========== 8 ==========
    add_heading_styled(doc, "8. 배포 및 운영", 1)
    for t in [
        "docker compose --env-file .env.production up -d --build",
        "필수: POSTGRES_PASSWORD, NEXTAUTH_SECRET, NEXTAUTH_URL, ALLOWED_ORIGINS",
        "FIREBASE_ENABLED=false (기본), 배포 후 선택 활성화",
        "상세: docs/HQ_DEPLOYMENT_FINAL_CHECKLIST.md",
    ]:
        add_bullet(doc, t)

    # ========== 9 Risks ==========
    add_heading_styled(doc, "9. Risks & Assumptions", 1)
    add_heading_styled(doc, "9.1 Assumptions (전제)", 2)
    add_table(
        doc,
        ["ID", "전제"],
        [
            ["A-01", "본사 서버에 Docker Compose 실행 환경과 사내망 8080 접근이 가능하다."],
            ["A-02", "초기 운영은 Credentials 로그인만으로 충분하며 Firebase는 후속 활성화한다."],
            ["A-03", "Part 2 거래·PG·전자계약은 Part 1 스키마를 깨지 않는 /api/v2로 확장한다."],
            ["A-04", "Pilot 대리점 수는 단계적으로 확대하며, 전 대리점 일괄 오픈은 하지 않는다."],
            ["A-05", "AI 기능은 OPENAI_API_KEY가 있을 때 완전 동작하며, 미설정 시 제한·폴백을 허용한다."],
            ["A-06", "문서함·근태·전자결재·통합검색은 코드 유지·메뉴 숨김이며 필요 시 토글로 공개한다."],
        ],
    )

    add_heading_styled(doc, "9.2 Risks (위험) 및 완화", 2)
    add_table(
        doc,
        ["ID", "위험", "영향", "완화"],
        [
            ["R-01", "대리점 Page Builder 오용·깨진 레이아웃", "중", "버전 백업·복원, HQ read-only, 템플릿 권장 흐름"],
            ["R-02", "온프레미스 단일 장애점", "고", "백업·롤백 절차, health 모니터링, 이미지 태그 보관"],
            ["R-03", "AI 비용·환각·민감정보 노출", "중", "출처 표시, 권한 내 검색, 키 관리, 사용량 모니터링"],
            ["R-04", "Firebase 활성화 시 설정 오류", "중", "기본 off, 문서화된 활성화 절차, 폴백 경로 유지"],
            ["R-05", "100개 대리점 동시 접속 부하", "중", "load-test, Redis, 단계적 롤아웃"],
            ["R-06", "모바일 UX 미흡으로 현장 사용률 저하", "중", "Design v5 Mobile First, touch-target, Pilot 피드백"],
            ["R-07", "Part 2 범위 조기 침범", "중", "플레이스홀더만 유지, 스키마 변경 사전 승인"],
        ],
    )

    # ========== 10 ==========
    add_heading_styled(doc, "10. 향후 개발 로드맵 (Part 2)", 1)
    add_table(
        doc,
        ["단계", "내용"],
        [
            ["Part 2-A", "발주서(Order) CRUD, 대리점 여신·사업자 정보"],
            ["Part 2-B", "세금계산서, 카드결제(PG)"],
            ["Part 2-C", "표준계약서·전자계약"],
            ["Part 2-D", "대리점 간 거래·재고"],
            ["Part 2-E", "Firebase 실서비스 활성화(선택)"],
            ["Frontend Phase 2", "다크모드 고도화, a11y 감사, 애니메이션·마이크로인터랙션"],
        ],
    )

    # ========== 11 ==========
    add_heading_styled(doc, "11. 배포 및 유지보수 가이드 요약", 1)
    add_para(doc, "배포 전: typecheck · lint · build · production:check · smoke · test:ui-upgrade", size=10.5)
    add_para(doc, "배포 후: health, 관리자 비밀번호 변경, 브랜딩·Page Builder·뉴스 키워드, Pilot 1곳", size=10.5)
    add_para(doc, "일상: DB/uploads 백업, activity·monitoring, 장애 시 compose logs 및 롤백", size=10.5)

    # ========== 12 Change History ==========
    add_heading_styled(doc, "12. 문서 변경 이력", 1)
    add_para(
        doc,
        "본 PRD의 개정 이력을 기록합니다. 제품 CHANGELOG(CHANGELOG.md)와 별도로, "
        "요구사항·범위·KPI·리스크 문서의 변경을 추적합니다.",
    )
    add_table(
        doc,
        ["버전", "일자", "작성/개정", "요약"],
        [
            [
                "1.2.1",
                "2026-07",
                "초안",
                "Phase 5 상용화 MVP 기준 PRD 최초 작성",
            ],
            [
                "1.2.1 Final",
                "2026-07-04",
                "개정",
                "스크린샷 캡처 지시, 비즈니스 KPI, Risks & Assumptions, "
                "Word 레이아웃·헤더/푸터, 변경 이력 섹션 추가. "
                "Frontend UX/UI Phase 1(Design System v5) 반영.",
            ],
        ],
    )
    add_para(doc, "변경 이력 기록 규칙", bold=True, color=NAVY)
    for t in [
        "범위(In/Out of Scope), KPI, Risks/Assumptions, 역할·권한이 바뀌면 반드시 본 섹션에 행을 추가한다.",
        "단순 오탈자·서식만 수정한 경우 버전 번호 없이 ‘서식 수정’으로 비고에 남길 수 있다.",
        "제품 릴리스 버전(package.json / CHANGELOG.md)과 PRD 버전은 다를 수 있으나, 표에 제품 버전을 병기한다.",
        "다음 개정 시 버전은 1.2.2 또는 1.3.0 PRD로 올리고, 일자·작성자·요약 3요소를 필수 기입한다.",
    ]:
        add_bullet(doc, t)

    add_para(doc, "향후 이력 기입 템플릿", bold=True, color=NAVY)
    add_table(
        doc,
        ["버전", "일자", "작성/개정", "요약"],
        [
            ["(예) 1.3.0 PRD", "YYYY-MM-DD", "작성자", "변경 요약 — 영향 섹션 번호 포함"],
        ],
    )

    # ========== 13 ==========
    add_heading_styled(doc, "13. 부록 — 문서 맵 및 용어", 1)
    add_table(
        doc,
        ["문서", "용도"],
        [
            ["docs/HQ_DEPLOYMENT_FINAL_CHECKLIST.md", "본사 배포 최종 체크리스트"],
            ["docs/PAGE_BUILDER.md", "Page Builder 운영"],
            ["docs/FIREBASE_HYBRID.md", "Firebase 활성화"],
            ["docs/ARCHITECTURE.md", "아키텍처"],
            ["CHANGELOG.md", "제품 변경 이력"],
            ["DEPLOY.md", "상세 배포"],
        ],
    )
    add_table(
        doc,
        ["용어", "정의"],
        [
            ["Part 1", "인트라넷 코어·Page Builder·AI"],
            ["Part 2", "B2B 거래·결제·계약·재고"],
            ["Self-Service", "대리점 자사 레이아웃 직접 편집"],
            ["Design System v5", "Modern Corporate UI 토큰·컴포넌트 체계"],
            ["상용화 MVP", "Firebase 없이 PostgreSQL만으로 운영 가능한 상태"],
        ],
    )

    doc.add_paragraph()
    add_para(
        doc,
        "— End of Document — Ten Eyes Intranet Part 1 PRD v1.2.1 Final —",
        size=9,
        color=MUTED,
        align=WD_ALIGN_PARAGRAPH.CENTER,
    )

    OUT.parent.mkdir(parents=True, exist_ok=True)
    doc.save(str(OUT))
    print(f"Wrote: {OUT}")


if __name__ == "__main__":
    build()
