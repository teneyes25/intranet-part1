import { cn } from "@/lib/utils";

interface RichTextContentProps {
  html: string;
  className?: string;
}

/**
 * 서버에서 새니타이즈된 HTML 을 렌더링한다.
 */
export function RichTextContent({ html, className }: RichTextContentProps) {
  return (
    <div
      className={cn(
        "overflow-x-hidden break-words text-sm leading-relaxed [overflow-wrap:anywhere] [&_a]:break-all [&_h2]:mt-3 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mt-2 [&_h3]:text-base [&_h3]:font-semibold [&_p]:my-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&_a]:text-primary [&_a]:underline [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded [&_pre]:bg-muted [&_pre]:p-3 [&_table]:my-2 [&_table]:w-full [&_table]:border-collapse [&_th]:border [&_th]:border-neutral-400 [&_th]:bg-neutral-50 [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_td]:border [&_td]:border-neutral-400 [&_td]:px-2 [&_td]:py-1",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
