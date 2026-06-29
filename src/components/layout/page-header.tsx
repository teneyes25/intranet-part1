import { PageHero } from "@/components/layout/page-hero";

interface PageHeaderProps {
  title: string;
  description?: string;
  eyebrow?: string;
  badge?: string;
  variant?: "default" | "plain";
}

/** @deprecated PageHero 사용 권장 — 하위 호환용 래퍼 */
export function PageHeader({
  title,
  description,
  eyebrow,
  badge,
  variant = "plain",
}: PageHeaderProps) {
  return (
    <PageHero
      variant={variant}
      title={title}
      description={description}
      eyebrow={eyebrow}
      badge={badge}
      className="mb-2"
    />
  );
}
