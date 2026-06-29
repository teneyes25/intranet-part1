import type { Editor } from "grapesjs";

import { CANVAS_DESIGN_TOKEN_CSS } from "@/features/page-layout/canvas-design-tokens";
import { registerGrapesComponentTypes } from "@/features/page-layout/grapes-component-types";
import type { PageThemeRecord } from "@/features/page-layout/types";
import { getGrapesKoI18nOptions } from "@/features/page-layout/grapes-i18n-ko";

const INTRANET_CATEGORY = "인트라넷";
const LAYOUT_CATEGORY = "레이아웃";
const COMMERCE_CATEGORY = "상거래·B2B";
const PRODUCT_CATEGORY = "상품 상세";

function blockMedia(svg: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="28" height="28">${svg}</svg>`;
}

export function registerIntranetBlocks(editor: Editor) {
  const bm = editor.BlockManager;

  bm.add("intranet-hero", {
    label: "히어로",
    category: LAYOUT_CATEGORY,
    media: blockMedia('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 15h4M7 11h10"/>'),
    content: { type: "intranet-hero" },
  });

  bm.add("intranet-banner", {
    label: "배너",
    category: LAYOUT_CATEGORY,
    media: blockMedia('<rect x="2" y="7" width="20" height="10" rx="2"/>'),
    content: `
      <section class="intranet-banner" style="padding:48px 32px;background:linear-gradient(135deg,#0F172A,#1E293B);color:#fff;border-radius:16px;text-align:center;">
        <h1 style="font-size:2rem;font-weight:700;margin:0 0 8px;">인트라넷 포털</h1>
        <p style="opacity:0.85;margin:0 0 20px;">팀의 모든 소식과 업무를 한곳에서</p>
        <a href="/dashboard" class="intranet-btn" style="display:inline-block;padding:10px 20px;background:#2563EB;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">시작하기</a>
      </section>
    `,
  });

  bm.add("intranet-card-grid", {
    label: "카드 그리드",
    category: LAYOUT_CATEGORY,
    media: blockMedia('<rect x="2" y="4" width="6" height="8" rx="1"/><rect x="9" y="4" width="6" height="8" rx="1"/><rect x="16" y="4" width="6" height="8" rx="1"/>'),
    content: `
      <div class="intranet-card-grid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;">
        <article class="intranet-card" style="padding:24px;border:1px solid #E2E8F0;border-radius:12px;background:#fff;">
          <h3 style="margin:0 0 8px;font-size:1rem;color:#0F172A;">카드 1</h3>
          <p style="margin:0;color:#64748B;font-size:0.875rem;">설명 텍스트</p>
        </article>
        <article class="intranet-card" style="padding:24px;border:1px solid #E2E8F0;border-radius:12px;background:#fff;">
          <h3 style="margin:0 0 8px;font-size:1rem;color:#0F172A;">카드 2</h3>
          <p style="margin:0;color:#64748B;font-size:0.875rem;">설명 텍스트</p>
        </article>
        <article class="intranet-card" style="padding:24px;border:1px solid #E2E8F0;border-radius:12px;background:#fff;">
          <h3 style="margin:0 0 8px;font-size:1rem;color:#0F172A;">카드 3</h3>
          <p style="margin:0;color:#64748B;font-size:0.875rem;">설명 텍스트</p>
        </article>
      </div>
    `,
  });

  bm.add("intranet-card", {
    label: "카드",
    category: INTRANET_CATEGORY,
    media: blockMedia('<rect x="4" y="4" width="16" height="16" rx="2"/>'),
    content: `
      <article class="intranet-card" style="padding:24px;border:1px solid #E2E8F0;border-radius:12px;background:#fff;box-shadow:0 1px 3px rgba(15,23,42,0.08);">
        <h3 style="margin:0 0 8px;font-size:1.125rem;color:#0F172A;">카드 제목</h3>
        <p style="margin:0;color:#64748B;line-height:1.6;">카드 설명 텍스트를 입력하세요.</p>
      </article>
    `,
  });

  bm.add("intranet-testimonial", {
    label: "추천사",
    category: INTRANET_CATEGORY,
    content: `
      <div class="intranet-testimonial" style="padding:28px;border-radius:12px;background:#F8FAFC;border:1px solid #E2E8F0;">
        <p style="margin:0 0 12px;font-size:1.125rem;color:#334155;line-height:1.7;font-style:italic;">"고객 또는 팀원의 추천사를 입력하세요."</p>
        <p style="margin:0;font-size:0.875rem;font-weight:600;color:#0F172A;">— 작성자 이름</p>
      </div>
    `,
  });

  bm.add("intranet-button", {
    label: "버튼",
    category: INTRANET_CATEGORY,
    content: `
      <a href="/dashboard" class="intranet-btn" style="display:inline-block;padding:10px 20px;background:#2563EB;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">버튼</a>
    `,
  });

  bm.add("intranet-gallery", {
    label: "이미지 갤러리",
    category: INTRANET_CATEGORY,
    content: `
      <div class="intranet-gallery" style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;">
        <img src="/icons/icon.svg" alt="" style="width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:8px;background:#F1F5F9;" />
        <img src="/icons/icon.svg" alt="" style="width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:8px;background:#F1F5F9;" />
        <img src="/icons/icon.svg" alt="" style="width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:8px;background:#F1F5F9;" />
      </div>
    `,
  });

  bm.add("intranet-ai-chat", {
    label: "AI 위젯",
    category: INTRANET_CATEGORY,
    media: blockMedia('<circle cx="12" cy="12" r="8"/><path d="M9 12h6M12 9v6"/>'),
    content: `
      <div class="intranet-ai" style="padding:24px;border-radius:12px;border:1px solid #BFDBFE;background:linear-gradient(135deg,#EFF6FF,#F8FAFC);">
        <p style="margin:0 0 4px;font-size:0.75rem;font-weight:600;color:#2563EB;text-transform:uppercase;">AI Agent</p>
        <h3 style="margin:0 0 8px;color:#0F172A;">AI 에이전트에게 물어보세요</h3>
        <p style="margin:0 0 16px;color:#64748B;font-size:0.875rem;">문서 검색, 요약, 업무 지원</p>
        <a href="/ai-agent" style="display:inline-block;padding:8px 16px;background:#2563EB;color:#fff;border-radius:8px;text-decoration:none;font-size:0.875rem;">AI 열기</a>
      </div>
    `,
  });

  bm.add("intranet-notice-list", {
    label: "공지 목록 (라이브)",
    category: INTRANET_CATEGORY,
    media: blockMedia('<path d="M4 6h16M4 10h16M4 14h10"/>'),
    content: {
      type: "intranet-data-widget",
      attributes: {
        "data-intranet-widget": "notices",
        "data-board-key": "notices",
        "data-limit": "5",
      },
    },
  });
}

export function registerCommerceBlocks(editor: Editor) {
  const bm = editor.BlockManager;

  bm.add("intranet-product-header", {
    label: "상품 헤더",
    category: PRODUCT_CATEGORY,
    media: blockMedia('<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 9h8M8 13h5"/>'),
    content: { type: "intranet-product-header" },
  });

  bm.add("intranet-product-gallery", {
    label: "상품 갤러리",
    category: PRODUCT_CATEGORY,
    content: { type: "intranet-product-gallery" },
  });

  bm.add("intranet-spec-table", {
    label: "스펙 테이블",
    category: PRODUCT_CATEGORY,
    content: { type: "intranet-spec-table" },
  });

  bm.add("intranet-buy-btn", {
    label: "구매·문의 CTA",
    category: PRODUCT_CATEGORY,
    content: `
      <div style="display:flex;flex-wrap:wrap;gap:12px;align-items:center;">
        <a href="/dealer-portal" class="intranet-buy-btn" style="display:inline-block;padding:14px 32px;background:#2563EB;color:#fff;border-radius:8px;text-decoration:none;font-weight:700;">구매 문의</a>
        <a href="/commerce/orders/new" style="display:inline-block;padding:14px 24px;border:1px solid #E2E8F0;color:#0F172A;border-radius:8px;text-decoration:none;font-weight:600;">발주서 작성</a>
      </div>
    `,
  });

  const commerceBlocks: { id: string; label: string; module: string }[] = [
    { id: "intranet-order-widget", label: "발주서", module: "order" },
    { id: "intranet-tax-invoice-widget", label: "세금계산서", module: "tax-invoice" },
    { id: "intranet-payment-widget", label: "카드결제", module: "payment" },
    { id: "intranet-contract-widget", label: "표준계약서", module: "contract" },
  ];

  for (const b of commerceBlocks) {
    bm.add(b.id, {
      label: b.label,
      category: COMMERCE_CATEGORY,
      media: blockMedia('<rect x="3" y="3" width="18" height="18" rx="2" stroke-dasharray="4 2"/>'),
      content: {
        type: "intranet-commerce-widget",
        attributes: { "data-commerce-module": b.module },
      },
    });
  }
}

export function registerAllPageBuilderBlocks(editor: Editor) {
  registerGrapesComponentTypes(editor);
  registerIntranetBlocks(editor);
  registerCommerceBlocks(editor);
}

export function getGrapesEditorOptions(
  container: HTMLElement,
  theme?: PageThemeRecord | null,
) {
  const canvasStyles = [
    "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css",
  ];

  return {
    ...getGrapesKoI18nOptions(),
    container,
    height: "100%",
    width: "auto",
    fromElement: false,
    storageManager: false,
    undoManager: { trackSelection: false, maximumStackLength: 64 },
    assetManager: { embedAsBase64: false },
    blockManager: {
      appendTo: undefined,
    },
    canvas: {
      styles: canvasStyles,
    },
    deviceManager: {
      devices: [
        { id: "desktop", name: "데스크톱", width: "" },
        { id: "tablet", name: "태블릿", width: "820px", widthMedia: "1024px" },
        { id: "mobile", name: "모바일", width: "390px", widthMedia: "480px" },
      ],
    },
    pluginsOpts: {
      "gjs-preset-webpage": {
        modalImportTitle: "HTML 가져오기",
        modalImportButton: "적용",
      },
    },
    ...(theme?.canvasCss
      ? {
          canvas: {
            styles: canvasStyles,
            scripts: [],
          },
        }
      : {}),
  };
}

export function applyThemeToEditor(editor: Editor, theme: PageThemeRecord | null) {
  const frame = editor.Canvas.getFrameEl();
  if (!frame?.contentDocument) return;

  const doc = frame.contentDocument;
  let styleEl = doc.getElementById("intranet-theme-canvas") as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = doc.createElement("style");
    styleEl.id = "intranet-theme-canvas";
    doc.head.appendChild(styleEl);
  }
  styleEl.textContent = `${CANVAS_DESIGN_TOKEN_CSS}\n${theme?.canvasCss ?? ""}`;
}

export function loadTemplateIntoEditor(
  editor: Editor,
  template: { projectData: Record<string, unknown>; html: string | null; css: string | null },
) {
  const pd = template.projectData;
  const storedCss =
    typeof pd?.storedCss === "string" ? pd.storedCss : (template.css ?? "");

  if (pd && Object.keys(pd).length > 0) {
    try {
      editor.loadProjectData(pd);
      if (storedCss) editor.setStyle(storedCss);
      return;
    } catch {
      /* fallback */
    }
  }

  if (template.html) {
    editor.setComponents(template.html);
    editor.setStyle(template.css ?? "");
  }
}
