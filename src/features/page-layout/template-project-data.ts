/**
 * GrapesJS projectData 시드 — HTML/CSS를 projectData에 함께 보관.
 * loadProjectData 실패 시 html/css fallback (loadTemplateIntoEditor).
 */
export function buildTemplateProjectData(
  html: string,
  css = "",
): Record<string, unknown> {
  const trimmed = html.trim();
  return {
    assets: [],
    styles: [],
    pages: trimmed
      ? [
          {
            id: "intranet-tpl-main",
            type: "main",
            frames: [
              {
                id: "intranet-tpl-frame",
                component: {
                  type: "wrapper",
                  attributes: { id: "intranet-root" },
                  components: trimmed,
                },
              },
            ],
          },
        ]
      : [],
    storedCss: css,
    seededFromHtml: true,
  };
}
