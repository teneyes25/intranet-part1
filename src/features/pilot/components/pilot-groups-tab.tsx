"use client";

import type { PilotGroup, User } from "@prisma/client";
import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  createPilotGroupAction,
  deletePilotGroupAction,
  savePilotGroupMembersAction,
} from "@/features/pilot/actions";
import { ROLE_LABELS } from "@/lib/auth/roles";
import type { Role } from "@/lib/auth/roles";

type GroupWithMembers = PilotGroup & {
  members: { user: Pick<User, "id" | "name" | "email" | "role"> }[];
};

export function PilotGroupsTab({
  groups,
  users,
}: {
  groups: GroupWithMembers[];
  users: Pick<User, "id" | "name" | "email" | "role">[];
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pilot 그룹 추가</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            action={(fd) =>
              startTransition(async () => {
                const r = await createPilotGroupAction(fd);
                if (r && "error" in r && typeof r.error === "string") toast.error(r.error);
                else toast.success("그룹이 생성되었습니다.");
              })
            }
            className="grid gap-3 sm:grid-cols-3"
          >
            <Input name="key" placeholder="key (영문)" required />
            <Input name="name" placeholder="그룹 이름" required />
            <Input name="description" placeholder="설명 (선택)" />
            <Button type="submit" disabled={pending} className="sm:col-span-3 w-fit">
              그룹 추가
            </Button>
          </form>
        </CardContent>
      </Card>

      {groups.map((group) => (
        <Card key={group.id}>
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle className="text-base">{group.name}</CardTitle>
              <CardDescription>
                {group.key} · {group.description ?? "설명 없음"}
                {!group.isActive && (
                  <Badge className="ml-2" variant="secondary">
                    비활성
                  </Badge>
                )}
              </CardDescription>
            </div>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() =>
                startTransition(async () => {
                  await deletePilotGroupAction(group.id);
                  toast.success("그룹이 삭제되었습니다.");
                })
              }
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <form
              action={(fd) => {
                fd.set("groupId", group.id);
                startTransition(async () => {
                  const r = await savePilotGroupMembersAction(fd);
                  if (r && "error" in r && typeof r.error === "string") toast.error(r.error);
                  else toast.success("멤버가 저장되었습니다.");
                });
              }}
            >
              <Label className="mb-2 block text-sm">Pilot 멤버 ({group.members.length}명)</Label>
              <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border p-2">
                {users.map((u) => (
                  <label key={u.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="userIds"
                      value={u.id}
                      defaultChecked={group.members.some((m) => m.user.id === u.id)}
                    />
                    <span>
                      {u.name} ({ROLE_LABELS[u.role as Role]}) — {u.email}
                    </span>
                  </label>
                ))}
              </div>
              <Button type="submit" disabled={pending} className="mt-3">
                멤버 저장
              </Button>
            </form>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
