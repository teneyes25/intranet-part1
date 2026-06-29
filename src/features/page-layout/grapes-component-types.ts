import type { Editor } from "grapesjs";

import { COMMERCE_MODULES } from "@/features/commerce/module-registry";

const COMMERCE_OPTIONS = Object.values(COMMERCE_MODULES).map((m) => ({
  id: m.id,
  value: m.id,
  name: m.label,
}));

/** GrapesJS Best Practice: 컴포넌트 타입 + Traits로 블록을 구성 */
export function registerGrapesComponentTypes(editor: Editor) {
  const dc = editor.DomComponents;

  dc.addType("intranet-hero", {
    isComponent: (el) =>
      el?.tagName === "SECTION" && el.classList?.contains("intranet-hero"),
    model: {
      defaults: {
        tagName: "section",
        attributes: { class: "intranet-hero" },
        traits: [
          { type: "text", name: "data-eyebrow", label: "상단 라벨" },
          { type: "text", name: "data-title", label: "제목" },
          { type: "text", name: "data-subtitle", label: "부제목" },
          { type: "text", name: "data-cta-label", label: "버튼 텍스트" },
          { type: "text", name: "data-cta-href", label: "버튼 링크" },
        ],
        components: `
          <p data-gjs-type="text" style="margin:0 0 8px;font-size:0.75rem;font-weight:600;opacity:0.8;text-transform:uppercase;">Welcome</p>
          <h1 data-gjs-type="text" style="font-size:2.25rem;font-weight:700;margin:0 0 12px;">히어로 제목</h1>
          <p data-gjs-type="text" style="opacity:0.85;margin:0 0 24px;max-width:520px;">부제목과 핵심 메시지를 입력하세요.</p>
          <a href="/dashboard" data-gjs-type="link" class="intranet-hero-cta" style="display:inline-block;padding:12px 24px;background:#2563EB;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">시작하기</a>
        `,
        styles: `
          .intranet-hero {
            padding: 56px 32px;
            background: linear-gradient(135deg, #0F172A, #1E293B);
            color: #fff;
            border-radius: 16px;
          }
        `,
      },
    },
  });

  dc.addType("intranet-commerce-widget", {
    isComponent: (el) =>
      Boolean(el?.getAttribute?.("data-commerce-module")) ||
      el?.classList?.contains("intranet-commerce-widget"),
    model: {
      defaults: {
        tagName: "div",
        attributes: {
          class: "intranet-commerce-widget",
          "data-commerce-module": "order",
        },
        traits: [
          {
            type: "select",
            name: "data-commerce-module",
            label: "거래 모듈",
            options: COMMERCE_OPTIONS,
          },
          { type: "text", name: "data-module-title", label: "표시 제목" },
          { type: "text", name: "data-module-desc", label: "설명" },
        ],
        components: `
          <p style="margin:0 0 4px;font-size:0.7rem;font-weight:600;color:#64748B;text-transform:uppercase;">B2B Commerce</p>
          <h4 style="margin:0 0 8px;color:#0F172A;font-size:1rem;">발주서 위젯</h4>
          <p style="margin:0;font-size:0.8125rem;color:#64748B;">대리점 Self-Service 발주 · Part 2 연동</p>
        `,
        styles: `
          .intranet-commerce-widget {
            padding: 20px;
            border: 2px dashed #94A3B8;
            border-radius: 12px;
            background: linear-gradient(180deg, #F8FAFC, #fff);
            text-align: center;
          }
        `,
      },
    },
  });

  dc.addType("intranet-product-header", {
    isComponent: (el) => el?.classList?.contains("intranet-product-header"),
    model: {
      defaults: {
        tagName: "header",
        attributes: { class: "intranet-product-header" },
        traits: [
          { type: "text", name: "data-product-name", label: "상품명" },
          { type: "text", name: "data-product-sku", label: "SKU" },
          { type: "text", name: "data-product-price", label: "가격" },
          { type: "text", name: "data-product-badge", label: "배지" },
        ],
        components: `
          <span style="display:inline-block;padding:4px 10px;border-radius:999px;background:#EFF6FF;color:#2563EB;font-size:0.75rem;font-weight:600;margin-bottom:12px;">신제품</span>
          <h1 style="margin:0 0 8px;font-size:1.75rem;font-weight:700;color:#0F172A;">상품명</h1>
          <p style="margin:0 0 4px;font-size:0.875rem;color:#64748B;">SKU: PRD-0001</p>
          <p style="margin:0;font-size:1.25rem;font-weight:700;color:#2563EB;">₩0</p>
        `,
        styles: `
          .intranet-product-header {
            padding: 24px;
            border: 1px solid #E2E8F0;
            border-radius: 12px;
            background: #fff;
          }
        `,
      },
    },
  });

  dc.addType("intranet-product-gallery", {
    isComponent: (el) => el?.classList?.contains("intranet-product-gallery"),
    model: {
      defaults: {
        tagName: "div",
        attributes: { class: "intranet-product-gallery" },
        traits: [
          {
            type: "select",
            name: "data-columns",
            label: "열 수",
            options: [
              { id: "2", value: "2", name: "2열" },
              { id: "3", value: "3", name: "3열" },
              { id: "4", value: "4", name: "4열" },
            ],
          },
        ],
        components: `
          <figure style="margin:0;"><img src="/icons/icon.svg" alt="" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:8px;background:#F1F5F9;" /></figure>
          <figure style="margin:0;"><img src="/icons/icon.svg" alt="" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:8px;background:#F1F5F9;" /></figure>
          <figure style="margin:0;"><img src="/icons/icon.svg" alt="" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:8px;background:#F1F5F9;" /></figure>
          <figure style="margin:0;"><img src="/icons/icon.svg" alt="" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:8px;background:#F1F5F9;" /></figure>
        `,
        styles: `
          .intranet-product-gallery {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 8px;
          }
        `,
      },
    },
  });

  dc.addType("intranet-spec-table", {
    isComponent: (el) => el?.classList?.contains("intranet-spec-table"),
    model: {
      defaults: {
        tagName: "table",
        attributes: { class: "intranet-spec-table" },
        traits: [
          { type: "text", name: "data-spec-title", label: "테이블 제목" },
        ],
        components: `
          <tr style="background:#F8FAFC;border-bottom:1px solid #E2E8F0;"><td style="padding:10px 14px;font-weight:600;color:#0F172A;width:30%;">항목</td><td style="padding:10px 14px;color:#64748B;">값</td></tr>
          <tr style="border-bottom:1px solid #E2E8F0;"><td style="padding:10px 14px;font-weight:600;color:#0F172A;">모델명</td><td style="padding:10px 14px;color:#64748B;">—</td></tr>
          <tr><td style="padding:10px 14px;font-weight:600;color:#0F172A;">가격</td><td style="padding:10px 14px;color:#2563EB;font-weight:600;">₩0</td></tr>
        `,
        styles: `
          .intranet-spec-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.875rem;
            border: 1px solid #E2E8F0;
            border-radius: 8px;
            overflow: hidden;
          }
        `,
      },
    },
  });

  dc.addType("intranet-data-widget", {
    isComponent: (el) => Boolean(el?.getAttribute?.("data-intranet-widget")),
    model: {
      defaults: {
        tagName: "div",
        attributes: {
          class: "intranet-data-widget intranet-notices",
          "data-intranet-widget": "notices",
          "data-board-key": "notices",
          "data-limit": "5",
        },
        traits: [
          {
            type: "select",
            name: "data-intranet-widget",
            label: "위젯",
            options: [
              { id: "notices", value: "notices", name: "공지 목록" },
              { id: "news", value: "news", name: "뉴스 목록" },
            ],
          },
          { type: "text", name: "data-board-key", label: "게시판 key" },
          { type: "number", name: "data-limit", label: "표시 개수", min: 1, max: 10 },
        ],
        components: `
          <div style="padding:12px 16px;background:#F8FAFC;border-bottom:1px solid #E2E8F0;font-weight:600;color:#0F172A;">공지사항</div>
          <ul style="margin:0;padding:0;list-style:none;">
            <li style="padding:12px 16px;border-bottom:1px solid #F1F5F9;color:#334155;">최신 공지가 여기에 표시됩니다.</li>
          </ul>
        `,
        styles: `
          .intranet-data-widget {
            border: 1px solid #E2E8F0;
            border-radius: 12px;
            overflow: hidden;
            background: #fff;
          }
        `,
      },
    },
  });
}
