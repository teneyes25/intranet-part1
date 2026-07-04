export interface PageBuilderDraft {
  html: string;
  css: string;
  projectData: Record<string, unknown>;
  savedAt: string;
}

const PREFIX = "intranet:pb-draft:";

export function pageBuilderDraftKey(slug: string, dealerScope: string) {
  return `${PREFIX}${slug}:${dealerScope}`;
}

export function loadPageBuilderDraft(
  slug: string,
  dealerScope: string,
): PageBuilderDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(pageBuilderDraftKey(slug, dealerScope));
    if (!raw) return null;
    return JSON.parse(raw) as PageBuilderDraft;
  } catch {
    return null;
  }
}

export function savePageBuilderDraft(
  slug: string,
  dealerScope: string,
  draft: Omit<PageBuilderDraft, "savedAt">,
) {
  if (typeof window === "undefined") return;
  const payload: PageBuilderDraft = {
    ...draft,
    savedAt: new Date().toISOString(),
  };
  window.localStorage.setItem(
    pageBuilderDraftKey(slug, dealerScope),
    JSON.stringify(payload),
  );
}

export function clearPageBuilderDraft(slug: string, dealerScope: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(pageBuilderDraftKey(slug, dealerScope));
}

export function formatDraftTime(iso: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso));
}
