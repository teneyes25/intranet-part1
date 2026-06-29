import {

  sanitizePageLayoutCss,

  sanitizePageLayoutHtml,

} from "@/features/page-layout/sanitize";



interface PageLayoutRendererProps {

  html: string;

  css?: string | null;

  className?: string;

}



export function PageLayoutRenderer({

  html,

  css,

  className,

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

      <div

        className="page-layout-content"

        dangerouslySetInnerHTML={{ __html: safeHtml }}

      />

    </div>

  );

}


