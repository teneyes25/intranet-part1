import {
  sanitizePageLayoutCss,
  sanitizePageLayoutHtml,
} from "@/features/page-layout/sanitize";
import { LayoutContentHydrator } from "@/features/page-layout/components/layout-content-hydrator";

interface PageLayoutRendererProps {
  html: string;
  css?: string | null;
  className?: string;
  /** true면 commerce·data 위젯을 React로 하이드레이션 */
  hydrate?: boolean;
}

export function PageLayoutRenderer({
  html,
  css,
  className,
  hydrate = true,
}: PageLayoutRendererProps) {
  if (!html?.trim()) return null;

  const safeHtml = sanitizePageLayoutHtml(html);
  const safeCss = css ? sanitizePageLayoutCss(css) : "";

  return (
    <div className={className}>
      {safeCss && (
        <style
          dangerouslySetInnerHTML={{
            __html: safeCss,
          }}
        />
      )}
      {hydrate ? (
        <LayoutContentHydrator html={safeHtml} />
      ) : (
        <div
          className="page-layout-content"
          dangerouslySetInnerHTML={{ __html: safeHtml }}
        />
      )}
    </div>
  );
}
