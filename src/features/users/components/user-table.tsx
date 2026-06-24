"use client";

import { Loader2 } from "lucide-react";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { ROLE_LABELS } from "@/lib/auth/roles";
import type { UserListItem } from "@/features/users/services/user-service";
import {
  approveUserAction,
  rejectUserAction,
} from "@/features/users/actions";

interface UserTableProps {
  users: UserListItem[];
}

export function UserTable({ users }: UserTableProps) {
  const pending = users.filter((u) => u.approvalStatus === "PENDING");
  const others = users.filter((u) => u.approvalStatus !== "PENDING");

  return (
    <div className="space-y-6">
      {pending.length > 0 && (
        <PendingSection users={pending} />
      )}
      <UserListTable users={others} title="전체 사용자" />
    </div>
  );
}

function PendingSection({ users }: { users: UserListItem[] }) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-amber-600">
        승인 대기 ({users.length}명)
      </h3>
      <UserListTable users={users} showActions />
    </div>
  );
}

function UserListTable({
  users,
  title,
  showActions = false,
}: {
  users: UserListItem[];
  title?: string;
  showActions?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-lg border">
      {title && (
        <div className="border-b bg-muted/50 px-4 py-2 text-sm font-medium">
          {title}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/30 text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">이름</th>
              <th className="px-4 py-3 font-medium">이메일</th>
              <th className="px-4 py-3 font-medium">권한</th>
              <th className="px-4 py-3 font-medium">소속</th>
              <th className="px-4 py-3 font-medium">상태</th>
              {showActions && (
                <th className="px-4 py-3 font-medium">처리</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.length === 0 && (
              <tr>
                <td
                  colSpan={showActions ? 6 : 5}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  사용자가 없습니다.
                </td>
              </tr>
            )}
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-muted/30">
                <td className="px-4 py-3 font-medium">{u.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex rounded-full bg-secondary px-2 py-0.5 text-xs font-medium">
                    {ROLE_LABELS[u.role]}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {u.dealer ? `${u.dealer.name} (${u.dealer.code})` : "-"}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge user={u} />
                </td>
                {showActions && (
                  <td className="px-4 py-3">
                    <ApprovalButtons userId={u.id} />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ user }: { user: UserListItem }) {
  if (user.approvalStatus === "PENDING") {
    return (
      <span className="text-xs font-medium text-amber-600">승인 대기</span>
    );
  }
  if (user.approvalStatus === "REJECTED") {
    return (
      <span className="text-xs font-medium text-destructive">반려됨</span>
    );
  }
  return (
    <span
      className={
        user.isActive
          ? "inline-flex items-center gap-1 text-xs text-emerald-600"
          : "text-xs text-muted-foreground"
      }
    >
      <span
        className={
          user.isActive
            ? "h-1.5 w-1.5 rounded-full bg-emerald-500"
            : "h-1.5 w-1.5 rounded-full bg-muted-foreground"
        }
      />
      {user.isActive ? "활성" : "비활성"}
    </span>
  );
}

function ApprovalButtons({ userId }: { userId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex gap-1">
      <Button
        size="sm"
        disabled={pending}
        onClick={() => startTransition(() => approveUserAction(userId))}
      >
        {pending && <Loader2 className="h-3 w-3 animate-spin" />}
        승인
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => startTransition(() => rejectUserAction(userId))}
      >
        반려
      </Button>
    </div>
  );
}
