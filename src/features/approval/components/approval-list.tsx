import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/features/board/utils";
import {
  APPROVAL_STATUS_LABEL,
  APPROVAL_STATUS_VARIANT,
  type ApprovalStatusKey,
} from "../constants";

interface ApprovalListItem {
  id: string;
  title: string;
  status: string;
  drafter: { name: string };
  template?: { name: string } | null;
  createdAt: Date;
  submittedAt: Date | null;
  completedAt: Date | null;
  isMyTurn?: boolean;
}

export function ApprovalList({
  items,
  emptyText,
}: {
  items: ApprovalListItem[];
  emptyText: string;
}) {
  if (items.length === 0) {
    return (
      <p className="px-6 py-12 text-center text-sm text-muted-foreground">
        {emptyText}
      </p>
    );
  }

  return (
    <ul className="divide-y">
      {items.map((d) => (
        <li key={d.id}>
          <Link
            href={`/approval/${d.id}`}
            className="flex items-center gap-3 px-6 py-4 text-sm transition-all duration-200 hover:bg-primary/5"
          >
            <Badge
              variant={APPROVAL_STATUS_VARIANT[d.status as ApprovalStatusKey]}
            >
              {APPROVAL_STATUS_LABEL[d.status as ApprovalStatusKey]}
            </Badge>
            {d.isMyTurn && <Badge variant="destructive">결재 차례</Badge>}
            {d.template?.name && (
              <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
                {d.template.name}
              </span>
            )}
            <span className="flex-1 truncate font-medium">{d.title}</span>
            <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
              {d.drafter.name}
            </span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {formatDate(d.completedAt ?? d.submittedAt ?? d.createdAt)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
