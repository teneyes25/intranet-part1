"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { submitPilotFeedbackAction } from "@/features/pilot/actions";
import { FEEDBACK_CATEGORIES } from "@/features/pilot/types";

export function PilotFeedbackForm({ pageUrl }: { pageUrl?: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Pilot 피드백</CardTitle>
        <CardDescription>
          사용 중 불편한 점, 버그, 기능 제안을 알려주세요. (Pilot 그룹 사용자 전용)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          action={(fd) => {
            if (pageUrl) fd.set("pageUrl", pageUrl);
            startTransition(async () => {
              const r = await submitPilotFeedbackAction(fd);
              if (r && "error" in r && typeof r.error === "string") toast.error(r.error);
              else toast.success("피드백이 접수되었습니다. 감사합니다!");
            });
          }}
          className="space-y-4"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="category">카테고리</Label>
              <select
                id="category"
                name="category"
                required
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              >
                <option value="">선택</option>
                {FEEDBACK_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rating">만족도 (1~5)</Label>
              <select
                id="rating"
                name="rating"
                required
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              >
                <option value="">선택</option>
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {n}점
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="message">상세 내용</Label>
            <textarea
              id="message"
              name="message"
              required
              minLength={5}
              rows={5}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="어떤 화면에서 어떤 문제가 있었는지 구체적으로 적어 주세요."
            />
          </div>
          <Button type="submit" disabled={pending}>
            피드백 제출
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
