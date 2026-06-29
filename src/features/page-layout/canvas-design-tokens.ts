/** GrapesJS 캔버스와 앱 셸이 공유하는 B2B 디자인 토큰 */
export const CANVAS_DESIGN_TOKEN_CSS = `
:root {
  --pb-navy: #0F172A;
  --pb-slate: #64748B;
  --pb-border: #E2E8F0;
  --pb-muted: #F8FAFC;
  --pb-primary: #2563EB;
  --pb-primary-soft: #EFF6FF;
  --pb-radius: 12px;
  --pb-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
}
body {
  font-family: Pretendard, system-ui, sans-serif;
  color: var(--pb-navy);
  line-height: 1.6;
}
.intranet-hero,
.intranet-banner {
  border-radius: var(--pb-radius);
}
.intranet-card {
  border-radius: var(--pb-radius);
  box-shadow: var(--pb-shadow);
}
.intranet-commerce-widget {
  font-family: inherit;
}
`;
