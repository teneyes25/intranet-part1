import "server-only";

import sanitizeHtml from "sanitize-html";

/**
 * Rich Text(HTML) 콘텐츠를 안전하게 정제한다.
 * 서버 액션에서 DB 저장 전에 호출하여 저장형 XSS 를 방지한다.
 */
export function sanitizeRichText(dirty: string): string {
  return sanitizeHtml(dirty, {
    allowedTags: [
      "p",
      "br",
      "strong",
      "b",
      "em",
      "i",
      "u",
      "s",
      "h1",
      "h2",
      "h3",
      "ul",
      "ol",
      "li",
      "blockquote",
      "a",
      "code",
      "pre",
      "hr",
      "span",
      "table",
      "thead",
      "tbody",
      "tr",
      "th",
      "td",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      span: ["class", "style"],
      p: ["style"],
      h1: ["style"],
      h2: ["style"],
      h3: ["style"],
      table: ["style", "class"],
      th: ["style", "class", "colspan", "rowspan"],
      td: ["style", "class", "colspan", "rowspan"],
      tr: ["style", "class"],
      code: ["class"],
    },
    allowedStyles: {
      "*": {
        color: [/^#(0x)?[0-9a-f]+$/i, /^rgb\(/i, /^[a-z]+$/i],
        "font-size": [/^\d+(?:\.\d+)?(?:px|pt|em|rem)$/],
        "font-family": [/^[\w\s,"'-]+$/],
        "letter-spacing": [/^-?\d+(?:\.\d+)?(?:px|em|pt)$/],
        "font-stretch": [/^\d+(?:\.\d+)?%$/, /^(ultra-condensed|extra-condensed|condensed|semi-condensed|normal|semi-expanded|expanded|extra-expanded|ultra-expanded)$/],
        "line-height": [/^\d+(?:\.\d+)?$/, /^\d+(?:\.\d+)?(?:px|em|%)$/],
        margin: [/^-?\d+(?:\.\d+)?(?:px|em|rem)?(?:\s+-?\d+(?:\.\d+)?(?:px|em|rem)?){0,3}$/],
        "margin-bottom": [/^\d+(?:\.\d+)?(?:px|pt|em|rem)$/],
        "margin-top": [/^\d+(?:\.\d+)?(?:px|pt|em|rem)$/],
        "text-align": [/^(left|right|center|justify)$/],
        "font-weight": [/^\d{3}$/, /^(normal|bold)$/],
        "vertical-align": [/^(top|middle|bottom)$/],
        width: [/^\d+(?:\.\d+)?(?:px|%)$/],
        padding: [/^\d+(?:\.\d+)?(?:px)?(?:\s+\d+(?:\.\d+)?(?:px)?){0,3}$/],
        border: [/^[\d.]+px\s+solid\s+#?[0-9a-fA-F]+$/],
        "border-collapse": [/^(collapse|separate)$/],
        background: [/^#([0-9a-f]{3}|[0-9a-f]{6})$/i],
      },
    },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", {
        rel: "noopener noreferrer",
        target: "_blank",
      }),
    },
  });
}

/** 댓글 등 평문 입력 정제 (HTML 제거) */
export function sanitizePlainText(input: string): string {
  return sanitizeHtml(input, { allowedTags: [], allowedAttributes: {} });
}
