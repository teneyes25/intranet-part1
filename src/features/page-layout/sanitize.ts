import sanitizeHtml from "sanitize-html";

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    ...sanitizeHtml.defaults.allowedTags,
    "img",
    "section",
    "article",
    "figure",
    "figcaption",
    "header",
    "footer",
    "main",
    "nav",
  ],
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    "*": ["class", "style", "id", "data-gjs-type"],
    a: ["href", "name", "target", "rel", "title", "data-commerce-module"],
    div: ["class", "style", "id", "data-gjs-type", "data-commerce-module"],
    img: ["src", "alt", "width", "height", "loading"],
  },
  allowedSchemes: ["http", "https", "mailto", "tel", "data"],
};

export function sanitizePageLayoutHtml(html: string): string {
  return sanitizeHtml(html, SANITIZE_OPTIONS);
}

export function sanitizePageLayoutCss(css: string): string {
  return css.replace(/@import\b[^;]*;/gi, "").replace(/expression\s*\(/gi, "");
}
