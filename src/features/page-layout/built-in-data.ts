import { boardLayoutSlug, postDetailLayoutSlug } from "@/features/page-layout/types";

export interface BuiltInTheme {
  id: string;
  slug: string;
  name: string;
  description: string;
  cssVars: Record<string, string>;
  canvasCss: string;
  isDefault: boolean;
}

export interface BuiltInTemplate {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  targetSlug: string;
  thumbnail: string;
  sortOrder: number;
  html: string;
  css: string;
  projectData?: Record<string, unknown>;
}

export const BUILT_IN_THEMES: BuiltInTheme[] = [
  {
    id: "pt_navy",
    slug: "navy-corporate",
    name: "Navy Corporate",
    description: "본사 기본 — 딥 네이비 + 브랜드 블루",
    isDefault: true,
    cssVars: {
      primary: "#2563EB",
      accent: "#60A5FA",
      background: "#F8FAFC",
      text: "#0F172A",
    },
    canvasCss: `
      body { background: #F8FAFC; color: #0F172A; font-family: Pretendard, sans-serif; }
      .intranet-banner, .intranet-hero { background: linear-gradient(135deg,#0F172A,#1E293B) !important; }
      .intranet-btn, .intranet-hero-cta { background: #2563EB !important; }
    `,
  },
  {
    id: "pt_blue",
    slug: "bright-blue",
    name: "Bright Blue",
    description: "밝고 개방적인 블루 톤",
    isDefault: false,
    cssVars: {
      primary: "#1D4ED8",
      accent: "#93C5FD",
      background: "#EFF6FF",
      text: "#1E3A8A",
    },
    canvasCss: `
      body { background: #EFF6FF; color: #1E3A8A; font-family: Pretendard, sans-serif; }
      .intranet-banner, .intranet-hero { background: linear-gradient(135deg,#1D4ED8,#3B82F6) !important; }
      .intranet-btn, .intranet-hero-cta { background: #1D4ED8 !important; }
    `,
  },
  {
    id: "pt_warm",
    slug: "warm-dealer",
    name: "Warm Dealer",
    description: "대리점용 따뜻한 톤",
    isDefault: false,
    cssVars: {
      primary: "#EA580C",
      accent: "#FDBA74",
      background: "#FFF7ED",
      text: "#431407",
    },
    canvasCss: `
      body { background: #FFF7ED; color: #431407; font-family: Pretendard, sans-serif; }
      .intranet-banner, .intranet-hero { background: linear-gradient(135deg,#9A3412,#EA580C) !important; }
      .intranet-btn, .intranet-hero-cta { background: #EA580C !important; }
    `,
  },
  {
    id: "pt_minimal",
    slug: "minimal-slate",
    name: "Minimal Slate",
    description: "미니멀 슬레이트 그레이",
    isDefault: false,
    cssVars: {
      primary: "#475569",
      accent: "#94A3B8",
      background: "#FFFFFF",
      text: "#334155",
    },
    canvasCss: `
      body { background: #FFFFFF; color: #334155; font-family: Pretendard, sans-serif; }
      .intranet-banner, .intranet-hero { background: linear-gradient(135deg,#334155,#64748B) !important; }
      .intranet-btn, .intranet-hero-cta { background: #475569 !important; }
    `,
  },
];

const DASHBOARD_STARTER_HTML = `
<section class="intranet-hero" style="padding:56px 32px;background:linear-gradient(135deg,#0F172A,#1E293B);color:#fff;border-radius:16px;margin-bottom:24px;">
  <p style="margin:0 0 8px;font-size:0.75rem;font-weight:600;opacity:0.8;text-transform:uppercase;letter-spacing:0.05em;">Welcome</p>
  <h1 style="font-size:2.25rem;font-weight:700;margin:0 0 12px;">팀 포털에 오신 것을 환영합니다</h1>
  <p style="opacity:0.85;margin:0 0 24px;max-width:520px;">공지, 결재, AI Agent를 한곳에서 이용하세요.</p>
  <a href="/dashboard" class="intranet-hero-cta" style="display:inline-block;padding:12px 24px;background:#2563EB;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">대시보드 시작</a>
</section>
<div class="intranet-card-grid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:24px;">
  <article class="intranet-card" style="padding:24px;border:1px solid #E2E8F0;border-radius:12px;background:#fff;">
    <h3 style="margin:0 0 8px;font-size:1rem;color:#0F172A;">전자결재</h3>
    <p style="margin:0;color:#64748B;font-size:0.875rem;">결재 요청·승인 현황</p>
  </article>
  <article class="intranet-card" style="padding:24px;border:1px solid #E2E8F0;border-radius:12px;background:#fff;">
    <h3 style="margin:0 0 8px;font-size:1rem;color:#0F172A;">게시판</h3>
    <p style="margin:0;color:#64748B;font-size:0.875rem;">공지·홍보·업무 게시물</p>
  </article>
  <article class="intranet-card" style="padding:24px;border:1px solid #E2E8F0;border-radius:12px;background:#fff;">
    <h3 style="margin:0 0 8px;font-size:1rem;color:#0F172A;">AI Agent</h3>
    <p style="margin:0;color:#64748B;font-size:0.875rem;">문서 검색·업무 지원</p>
  </article>
</div>
`;

const BANNER_HERO_HTML = `
<section class="intranet-banner" style="padding:64px 40px;background:linear-gradient(135deg,#0F172A,#2563EB);color:#fff;border-radius:20px;text-align:center;">
  <h1 style="font-size:2.5rem;font-weight:700;margin:0 0 12px;">인트라넷 포털</h1>
  <p style="opacity:0.9;margin:0 0 28px;font-size:1.125rem;">모든 업무를 연결하는 하나의 공간</p>
  <a href="/ai-agent" class="intranet-btn" style="display:inline-block;padding:12px 28px;background:#fff;color:#0F172A;border-radius:999px;text-decoration:none;font-weight:700;">AI Agent 시작</a>
</section>
`;

const PR_CORPORATE_HTML = `
<section class="intranet-hero" style="padding:40px 32px;background:linear-gradient(135deg,#1E293B,#334155);color:#fff;border-radius:16px;margin-bottom:20px;">
  <h2 style="margin:0 0 8px;font-size:1.75rem;">홍보실</h2>
  <p style="margin:0;opacity:0.85;">최신 소식과 PR 콘텐츠를 확인하세요.</p>
</section>
<div class="intranet-testimonial" style="padding:28px;border-radius:12px;background:#F8FAFC;border:1px solid #E2E8F0;margin-bottom:20px;">
  <p style="margin:0 0 12px;font-size:1.125rem;color:#334155;line-height:1.7;font-style:italic;">"새로운 인트라넷으로 팀 커뮤니케이션이 한층 빨라졌습니다."</p>
  <p style="margin:0;font-size:0.875rem;font-weight:600;color:#0F172A;">— 홍보팀</p>
</div>
`;

export const BUILT_IN_TEMPLATES: BuiltInTemplate[] = [
  {
    id: "tpl_dashboard_starter",
    slug: "dashboard-starter",
    name: "대시보드 스타터",
    description: "Hero + 3열 카드 그리드",
    category: "dashboard",
    targetSlug: "dashboard",
    thumbnail: "📊",
    sortOrder: 1,
    html: DASHBOARD_STARTER_HTML,
    css: "",
  },
  {
    id: "tpl_dashboard_ai",
    slug: "dashboard-ai-focus",
    name: "AI 중심 대시보드",
    description: "AI Widget + 공지 목록",
    category: "dashboard",
    targetSlug: "dashboard",
    thumbnail: "🤖",
    sortOrder: 2,
    html: `
      <div class="intranet-ai" style="padding:32px;border-radius:16px;border:1px solid #BFDBFE;background:linear-gradient(135deg,#EFF6FF,#F8FAFC);margin-bottom:20px;">
        <p style="margin:0 0 4px;font-size:0.75rem;font-weight:600;color:#2563EB;text-transform:uppercase;">AI Agent</p>
        <h3 style="margin:0 0 8px;color:#0F172A;font-size:1.5rem;">AI 에이전트에게 물어보세요</h3>
        <p style="margin:0 0 20px;color:#64748B;">문서 검색, 요약, 업무 지원</p>
        <a href="/ai-agent" style="display:inline-block;padding:10px 20px;background:#2563EB;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">AI 열기</a>
      </div>
      <div class="intranet-notices" style="border:1px solid #E2E8F0;border-radius:12px;overflow:hidden;background:#fff;">
        <div style="padding:12px 16px;background:#F8FAFC;border-bottom:1px solid #E2E8F0;font-weight:600;">공지사항</div>
        <ul style="margin:0;padding:0;list-style:none;">
          <li style="padding:12px 16px;border-bottom:1px solid #F1F5F9;">새로운 인트라넷 포털 오픈</li>
          <li style="padding:12px 16px;">AI Agent 베타 서비스</li>
        </ul>
      </div>
    `,
    css: "",
  },
  {
    id: "tpl_banner_hero",
    slug: "banner-hero",
    name: "히어로 배너",
    description: "풀폭 그라데이션 배너",
    category: "banner",
    targetSlug: "banner",
    thumbnail: "🎯",
    sortOrder: 1,
    html: BANNER_HERO_HTML,
    css: "",
  },
  {
    id: "tpl_pr_corporate",
    slug: "pr-corporate",
    name: "홍보실 코퍼릿",
    description: "Hero + Testimonial",
    category: "board",
    targetSlug: boardLayoutSlug("pr"),
    thumbnail: "📢",
    sortOrder: 1,
    html: PR_CORPORATE_HTML,
    css: "",
  },
  {
    id: "tpl_board_header",
    slug: "board-header",
    name: "게시판 헤더",
    description: "모든 게시판 상단 Hero",
    category: "board",
    targetSlug: boardLayoutSlug("general"),
    thumbnail: "📋",
    sortOrder: 2,
    html: `
      <section class="intranet-hero" style="padding:32px 24px;background:linear-gradient(135deg,#1E293B,#334155);color:#fff;border-radius:12px;margin-bottom:16px;">
        <h2 style="margin:0 0 8px;font-size:1.5rem;">게시판</h2>
        <p style="margin:0;opacity:0.85;font-size:0.9375rem;">공지와 소식을 확인하세요.</p>
      </section>
    `,
    css: "",
  },
  {
    id: "tpl_product_showcase",
    slug: "product-showcase",
    name: "상품소개",
    description: "상품자료실 Hero + 카드 그리드 + 구매 CTA",
    category: "product",
    targetSlug: boardLayoutSlug("products"),
    thumbnail: "🛍️",
    sortOrder: 1,
    html: `
      <section class="intranet-hero" style="padding:40px 32px;background:linear-gradient(135deg,#0F172A,#2563EB);color:#fff;border-radius:16px;margin-bottom:20px;">
        <h2 style="margin:0 0 8px;font-size:1.75rem;">상품자료실</h2>
        <p style="margin:0;opacity:0.9;">카탈로그·사양서·가격표를 한곳에서</p>
      </section>
      <div class="intranet-card-grid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:20px;">
        <article class="intranet-card" style="padding:20px;border:1px solid #E2E8F0;border-radius:12px;background:#fff;">
          <h3 style="margin:0 0 6px;color:#0F172A;">신제품 A</h3>
          <p style="margin:0;color:#64748B;font-size:0.875rem;">2025 Spring Collection</p>
        </article>
        <article class="intranet-card" style="padding:20px;border:1px solid #E2E8F0;border-radius:12px;background:#fff;">
          <h3 style="margin:0 0 6px;color:#0F172A;">베스트셀러 B</h3>
          <p style="margin:0;color:#64748B;font-size:0.875rem;">누적 판매 1위</p>
        </article>
        <article class="intranet-card" style="padding:20px;border:1px solid #E2E8F0;border-radius:12px;background:#fff;">
          <h3 style="margin:0 0 6px;color:#0F172A;">프로모션 C</h3>
          <p style="margin:0;color:#64748B;font-size:0.875rem;">한정 특가</p>
        </article>
      </div>
      <a href="/boards/products" class="intranet-btn" style="display:inline-block;padding:12px 24px;background:#2563EB;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">상품 목록 보기</a>
    `,
    css: "",
  },
  {
    id: "tpl_event_promo",
    slug: "event-promo",
    name: "이벤트·프로모션",
    description: "이벤트 Hero + 일정 + CTA",
    category: "event",
    targetSlug: boardLayoutSlug("pr"),
    thumbnail: "🎉",
    sortOrder: 2,
    html: `
      <section class="intranet-hero" style="padding:48px 32px;background:linear-gradient(135deg,#1E3A8A,#3B82F6);color:#fff;border-radius:16px;margin-bottom:20px;text-align:center;">
        <p style="margin:0 0 8px;font-size:0.75rem;font-weight:600;opacity:0.85;text-transform:uppercase;">EVENT</p>
        <h2 style="margin:0 0 12px;font-size:2rem;">봄맞이 프로모션</h2>
        <p style="margin:0 0 20px;opacity:0.9;">3월 1일 ~ 3월 31일</p>
        <a href="/boards/pr" class="intranet-hero-cta" style="display:inline-block;padding:12px 28px;background:#fff;color:#1E3A8A;border-radius:999px;text-decoration:none;font-weight:700;">자세히 보기</a>
      </section>
    `,
    css: "",
  },
  {
    id: "tpl_product_detail",
    slug: "product-detail",
    name: "상품 상세",
    description: "갤러리 + 스펙 테이블 + 구매 버튼",
    category: "product",
    targetSlug: postDetailLayoutSlug("products"),
    thumbnail: "📦",
    sortOrder: 1,
    html: `
      <div class="intranet-product-gallery" style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:20px;">
        <img src="/icons/icon.svg" alt="" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:8px;background:#F1F5F9;" />
        <img src="/icons/icon.svg" alt="" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:8px;background:#F1F5F9;" />
        <img src="/icons/icon.svg" alt="" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:8px;background:#F1F5F9;" />
        <img src="/icons/icon.svg" alt="" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:8px;background:#F1F5F9;" />
      </div>
      <table class="intranet-spec-table" style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:0.875rem;">
        <tr style="border-bottom:1px solid #E2E8F0;"><td style="padding:10px;font-weight:600;color:#0F172A;width:30%;">모델명</td><td style="padding:10px;color:#64748B;">Product X Pro</td></tr>
        <tr style="border-bottom:1px solid #E2E8F0;"><td style="padding:10px;font-weight:600;color:#0F172A;">규격</td><td style="padding:10px;color:#64748B;">W500 × H300 × D200 mm</td></tr>
        <tr><td style="padding:10px;font-weight:600;color:#0F172A;">가격</td><td style="padding:10px;color:#2563EB;font-weight:600;">₩129,000</td></tr>
      </table>
      <a href="#" class="intranet-buy-btn" style="display:inline-block;padding:14px 32px;background:#2563EB;color:#fff;border-radius:8px;text-decoration:none;font-weight:700;">구매 문의</a>
    `,
    css: "",
  },
  {
    id: "tpl_dealer_welcome",
    slug: "dealer-welcome",
    name: "대리점 웰컴",
    description: "대리점용 Hero + 카드 그리드",
    category: "landing",
    targetSlug: "dashboard",
    thumbnail: "🏪",
    sortOrder: 3,
    html: `
      <section class="intranet-hero" style="padding:48px 32px;background:linear-gradient(135deg,#9A3412,#EA580C);color:#fff;border-radius:16px;margin-bottom:20px;">
        <h1 style="font-size:2rem;font-weight:700;margin:0 0 8px;">대리점 포털</h1>
        <p style="margin:0;opacity:0.9;">재고·주문·Rollout 정보를 확인하세요.</p>
      </section>
      <div class="intranet-card-grid" style="display:grid;grid-template-columns:repeat(2,1fr);gap:16px;">
        <article class="intranet-card" style="padding:20px;border:1px solid #FED7AA;border-radius:12px;background:#FFF7ED;">
          <h3 style="margin:0 0 6px;color:#9A3412;">재고 현황</h3>
          <p style="margin:0;color:#78350F;font-size:0.875rem;">실시간 재고 조회</p>
        </article>
        <article class="intranet-card" style="padding:20px;border:1px solid #FED7AA;border-radius:12px;background:#FFF7ED;">
          <h3 style="margin:0 0 6px;color:#9A3412;">주문 관리</h3>
          <p style="margin:0;color:#78350F;font-size:0.875rem;">발주·배송 추적</p>
        </article>
      </div>
    `,
    css: "",
  },
];
