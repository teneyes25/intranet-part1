"use client";

import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { formatPhoneDisplay } from "@/lib/phone";
import type { UserListItem } from "@/features/users/services/user-service";
import {
  approveUserAction,
  forceDeleteUserAction,
  forceWithdrawUserAction,
  rejectUserAction,
  resetUserPasswordAction,
  toggleUserActiveAction,
  updateUserPhoneAction,
} from "@/features/users/actions";

interface UserTableProps {
  users: UserListItem[];
  currentUserId: string;
}

export function UserTable({ users, currentUserId }: UserTableProps) {
  const pending = users.filter((u) => u.approvalStatus === "PENDING");
  const others = users.filter((u) => u.approvalStatus !== "PENDING");

  return (
    <div className="space-y-6">
      {pending.length > 0 && <PendingSection users={pending} />}
      <UserListTable
        users={others}
        title="전체 사용자"
        currentUserId={currentUserId}
        showManage
      />
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
  showManage = false,
  currentUserId,
}: {
  users: UserListItem[];
  title?: string;
  showActions?: boolean;
  showManage?: boolean;
  currentUserId?: string;
}) {
  const colSpan = showActions || showManage ? 7 : 6;
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
              <th className="px-4 py-3 font-medium">휴대폰</th>
              <th className="px-4 py-3 font-medium">권한</th>
              <th className="px-4 py-3 font-medium">소속</th>
              <th className="px-4 py-3 font-medium">상태</th>
              {(showActions || showManage) && (
                <th className="px-4 py-3 font-medium">처리</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.length === 0 && (
              <tr>
                <td
                  colSpan={colSpan}
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
                  {showManage || showActions ? (
                    <PhoneEditor userId={u.id} phone={u.phone} />
                  ) : (
                    <span className="text-muted-foreground">
                      {formatPhoneDisplay(u.phone)}
                    </span>
                  )}
                </td>
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
                {showManage && (
                  <td className="px-4 py-3">
                    <ManageButtons
                      user={u}
                      isSelf={u.id === currentUserId}
                    />
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

function PhoneEditor({
  userId,
  phone,
}: {
  userId: string;
  phone: string | null;
}) {
  const [value, setValue] = useState(
    phone ? formatPhoneDisplay(phone) : "",
  );
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const r = await updateUserPhoneAction(userId, value);
      if (r.error) {
        toast.error(r.error);
        return;
      }
      toast.success("휴대폰 번호를 저장했습니다.");
    });
  }

  return (
    <div className="flex min-w-[11rem] items-center gap-1">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="010-0000-0000"
        className="h-8 w-36 text-xs"
      />
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-8 px-2 text-xs"
        disabled={pending}
        onClick={save}
      >
        {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : "저장"}
      </Button>
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
      <span className="text-xs font-medium text-destructive">
        {user.isActive ? "반려됨" : "탈퇴/반려"}
      </span>
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

function ManageButtons({
  user,
  isSelf,
}: {
  user: UserListItem;
  isSelf: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [lastTemp, setLastTemp] = useState<string | null>(null);

  function run(
    fn: () => Promise<{ ok?: boolean; error?: string; tempPassword?: string }>,
    confirmMsg?: string,
  ) {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    startTransition(async () => {
      const r = await fn();
      if (r.error) {
        toast.error(r.error);
        return;
      }
      if (r.tempPassword) {
        setLastTemp(r.tempPassword);
        toast.success(`임시 비밀번호: ${r.tempPassword}`);
      } else {
        toast.success("처리되었습니다.");
      }
    });
  }

  return (
    <div className="flex min-w-[14rem] flex-col gap-1">
      <div className="flex flex-wrap gap-1">
        {user.approvalStatus === "APPROVED" && (
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() =>
              run(
                () => resetUserPasswordAction(user.id),
                `${user.name} 님의 비밀번호를 초기화할까요?`,
              )
            }
          >
            {pending && <Loader2 className="h-3 w-3 animate-spin" />}
            비번 초기화
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          disabled={pending || isSelf}
          onClick={() =>
            run(() => toggleUserActiveAction(user.id, !user.isActive))
          }
        >
          {user.isActive ? "비활성화" : "활성화"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={pending || isSelf}
          onClick={() =>
            run(
              () => forceWithdrawUserAction(user.id),
              `${user.name} 님을 강제 탈퇴(비활성) 처리할까요?`,
            )
          }
        >
          강제탈퇴
        </Button>
        <Button
          size="sm"
          variant="destructive"
          disabled={pending || isSelf}
          onClick={() =>
            run(
              () => forceDeleteUserAction(user.id),
              `${user.name} 계정을 완전 삭제할까요? (이력 없으면만 가능)`,
            )
          }
        >
          삭제
        </Button>
      </div>
      {lastTemp && (
        <p className="text-[11px] text-muted-foreground">
          최근 임시 비번: <code className="font-mono">{lastTemp}</code>
        </p>
      )}
    </div>
  );
}
