import type { LucideIcon } from "lucide-react";

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
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <Icon className="h-7 w-7" />
            </span>
            <div>
              <p className="font-medium">준비 중인 메뉴입니다</p>
              <p className="text-sm text-muted-foreground">
                {title} 기능은 다음 파트에서 구현됩니다.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
