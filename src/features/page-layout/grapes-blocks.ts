import type { Editor } from "grapesjs";



import type { PageThemeRecord } from "@/features/page-layout/types";
import { getGrapesKoI18nOptions } from "@/features/page-layout/grapes-i18n-ko";



const INTRANET_CATEGORY = "인트라넷";

const LAYOUT_CATEGORY = "레이아웃";



export function registerIntranetBlocks(editor: Editor) {

  const bm = editor.BlockManager;



  bm.add("intranet-hero", {
    label: "히어로",

    category: LAYOUT_CATEGORY,

    content: `

      <section class="intranet-hero" style="padding:56px 32px;background:linear-gradient(135deg,#0F172A,#1E293B);color:#fff;border-radius:16px;">

        <p style="margin:0 0 8px;font-size:0.75rem;font-weight:600;opacity:0.8;text-transform:uppercase;">Welcome</p>

        <h1 style="font-size:2.25rem;font-weight:700;margin:0 0 12px;">히어로 제목</h1>

        <p style="opacity:0.85;margin:0 0 24px;max-width:520px;">부제목과 핵심 메시지를 입력하세요.</p>

        <a href="/dashboard" class="intranet-hero-cta" style="display:inline-block;padding:12px 24px;background:#2563EB;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">시작하기</a>

      </section>

    `,

  });



  bm.add("intranet-banner", {
    label: "배너",

    category: LAYOUT_CATEGORY,

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
    label: "공지 목록",

    category: INTRANET_CATEGORY,

    content: `

      <div class="intranet-notices" style="border:1px solid #E2E8F0;border-radius:12px;overflow:hidden;background:#fff;">

        <div style="padding:12px 16px;background:#F8FAFC;border-bottom:1px solid #E2E8F0;font-weight:600;color:#0F172A;">공지사항</div>

        <ul style="margin:0;padding:0;list-style:none;">

          <li style="padding:12px 16px;border-bottom:1px solid #F1F5F9;color:#334155;">새로운 인트라넷 포털이 오픈되었습니다.</li>

          <li style="padding:12px 16px;border-bottom:1px solid #F1F5F9;color:#334155;">전자결재 시스템 이용 안내</li>

          <li style="padding:12px 16px;color:#334155;">AI Agent 베타 서비스 시작</li>

        </ul>

      </div>

    `,

  });
}

const COMMERCE_CATEGORY = "상거래·거래";

export function registerCommerceBlocks(editor: Editor) {
  const bm = editor.BlockManager;

  bm.add("intranet-product-gallery", {
    label: "상품 갤러리",
    category: COMMERCE_CATEGORY,
    content: `
      <div class="intranet-product-gallery" style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;">
        <img src="/icons/icon.svg" alt="" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:8px;background:#F1F5F9;" />
        <img src="/icons/icon.svg" alt="" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:8px;background:#F1F5F9;" />
        <img src="/icons/icon.svg" alt="" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:8px;background:#F1F5F9;" />
        <img src="/icons/icon.svg" alt="" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:8px;background:#F1F5F9;" />
      </div>
    `,
  });

  bm.add("intranet-spec-table", {
    label: "스펙 테이블",
    category: COMMERCE_CATEGORY,
    content: `
      <table class="intranet-spec-table" style="width:100%;border-collapse:collapse;font-size:0.875rem;border:1px solid #E2E8F0;border-radius:8px;overflow:hidden;">
        <tr style="background:#F8FAFC;border-bottom:1px solid #E2E8F0;"><td style="padding:10px 14px;font-weight:600;color:#0F172A;width:30%;">항목</td><td style="padding:10px 14px;color:#64748B;">값</td></tr>
        <tr style="border-bottom:1px solid #E2E8F0;"><td style="padding:10px 14px;font-weight:600;color:#0F172A;">모델명</td><td style="padding:10px 14px;color:#64748B;">—</td></tr>
        <tr><td style="padding:10px 14px;font-weight:600;color:#0F172A;">가격</td><td style="padding:10px 14px;color:#2563EB;font-weight:600;">₩0</td></tr>
      </table>
    `,
  });

  bm.add("intranet-buy-btn", {
    label: "구매·문의 버튼",
    category: COMMERCE_CATEGORY,
    content: `
      <a href="#" class="intranet-buy-btn" style="display:inline-block;padding:14px 32px;background:#2563EB;color:#fff;border-radius:8px;text-decoration:none;font-weight:700;">구매 문의</a>
    `,
  });

  bm.add("intranet-order-widget", {
    label: "발주서 (Part 2)",
    category: COMMERCE_CATEGORY,
    content: `
      <div class="intranet-commerce-widget intranet-order" data-commerce-module="order" style="padding:20px;border:2px dashed #94A3B8;border-radius:12px;background:#F8FAFC;text-align:center;">
        <p style="margin:0 0 4px;font-size:0.7rem;font-weight:600;color:#64748B;text-transform:uppercase;">Module · Part 2</p>
        <h4 style="margin:0 0 8px;color:#0F172A;">발주서 위젯</h4>
        <p style="margin:0;font-size:0.8125rem;color:#64748B;">표준 발주서 모듈 연동 예정</p>
      </div>
    `,
  });

  bm.add("intranet-tax-invoice-widget", {
    label: "세금계산서 (Part 2)",
    category: COMMERCE_CATEGORY,
    content: `
      <div class="intranet-commerce-widget intranet-tax" data-commerce-module="tax-invoice" style="padding:20px;border:2px dashed #94A3B8;border-radius:12px;background:#F8FAFC;text-align:center;">
        <p style="margin:0 0 4px;font-size:0.7rem;font-weight:600;color:#64748B;text-transform:uppercase;">Module · Part 2</p>
        <h4 style="margin:0 0 8px;color:#0F172A;">세금계산서 위젯</h4>
        <p style="margin:0;font-size:0.8125rem;color:#64748B;">전자세금계산서 모듈 연동 예정</p>
      </div>
    `,
  });

  bm.add("intranet-payment-widget", {
    label: "카드결제 (Part 2)",
    category: COMMERCE_CATEGORY,
    content: `
      <div class="intranet-commerce-widget intranet-payment" data-commerce-module="payment" style="padding:20px;border:2px dashed #94A3B8;border-radius:12px;background:#F8FAFC;text-align:center;">
        <p style="margin:0 0 4px;font-size:0.7rem;font-weight:600;color:#64748B;text-transform:uppercase;">Module · Part 2</p>
        <h4 style="margin:0 0 8px;color:#0F172A;">카드결제 위젯</h4>
        <p style="margin:0;font-size:0.8125rem;color:#64748B;">PG 연동 결제 모듈 예정</p>
      </div>
    `,
  });

  bm.add("intranet-contract-widget", {
    label: "표준계약서 (Part 2)",
    category: COMMERCE_CATEGORY,
    content: `
      <div class="intranet-commerce-widget intranet-contract" data-commerce-module="contract" style="padding:20px;border:2px dashed #94A3B8;border-radius:12px;background:#F8FAFC;text-align:center;">
        <p style="margin:0 0 4px;font-size:0.7rem;font-weight:600;color:#64748B;text-transform:uppercase;">Module · Part 2</p>
        <h4 style="margin:0 0 8px;color:#0F172A;">표준계약서 위젯</h4>
        <p style="margin:0;font-size:0.8125rem;color:#64748B;">전자계약·표준양식 모듈 연동 예정</p>
      </div>
    `,
  });
}

export function registerAllPageBuilderBlocks(editor: Editor) {
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
    assetManager: { embedAsBase64: true },

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

  styleEl.textContent = theme?.canvasCss ?? "";

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


