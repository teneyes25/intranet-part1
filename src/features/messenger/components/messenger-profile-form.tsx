"use client";

import { useTransition } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveMessengerProfileAction } from "@/features/messenger/actions";

export function MessengerProfileForm({
  userId,
  profile,
  jobs,
  selectedJobIds,
}: {
  userId: string;
  profile: {
    workplace: string | null;
    title: string | null;
    rank: string | null;
    hiredAt: Date | string | null;
    photoStorageKey: string | null;
  } | null;
  jobs: { id: string; name: string }[];
  selectedJobIds: string[];
}) {
  const [pending, start] = useTransition();
  const hired =
    profile?.hiredAt != null
      ? new Date(profile.hiredAt).toISOString().slice(0, 10)
      : "";

  return (
    <form
      className="space-y-4"
      action={(fd) =>
        start(async () => {
          const r = await saveMessengerProfileAction(fd);
          if ("error" in r && r.error) toast.error(r.error);
          else toast.success("메신저 회원 정보를 저장했습니다.");
        })
      }
    >
      <div className="space-y-1">
        <Label>사진</Label>
        {profile?.photoStorageKey && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/messenger/photo/${userId}`}
            alt=""
            className="mb-2 h-16 w-16 rounded-full object-cover"
          />
        )}
        <Input name="photo" type="file" accept="image/*" />
        <p className="text-xs text-muted-foreground">JPG/PNG, 최대 10MB</p>
      </div>
      <div className="space-y-1">
        <Label>근무지</Label>
        <Input name="workplace" defaultValue={profile?.workplace ?? ""} />
      </div>
      <div className="space-y-1">
        <Label>직책</Label>
        <Input name="title" defaultValue={profile?.title ?? ""} placeholder="예: 팀장" />
      </div>
      <div className="space-y-1">
        <Label>직급</Label>
        <Input name="rank" defaultValue={profile?.rank ?? ""} placeholder="예: 대리" />
      </div>
      <div className="space-y-1">
        <Label>입사일</Label>
        <Input name="hiredAt" type="date" defaultValue={hired} />
      </div>
      <div className="space-y-1">
        <Label>업무 (복수 선택)</Label>
        <div className="flex flex-wrap gap-2">
          {jobs.map((j) => (
            <label key={j.id} className="flex items-center gap-1 text-sm">
              <input
                type="checkbox"
                name="jobIds"
                value={j.id}
                defaultChecked={selectedJobIds.includes(j.id)}
              />
              {j.name}
            </label>
          ))}
        </div>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        저장
      </Button>
    </form>
  );
}
