import type { LucideIcon } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";

interface PagePlaceholderProps {
  title: string;
  description?: string;
  icon: LucideIcon;
  children?: React.ReactNode;
}

export function PagePlaceholder({
  title,
  description,
  icon: Icon,
  children,
}: PagePlaceholderProps) {
  return (
    <div>
      <PageHeader title={title} description={description} />
      {children ?? (
        <Card className="overflow-hidden shadow-card">
          <CardContent className="p-0">
            <EmptyState
              icon={Icon}
              title="준비 중인 메뉴입니다"
              description={`${title} 기능은 다음 파트에서 구현됩니다.`}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
