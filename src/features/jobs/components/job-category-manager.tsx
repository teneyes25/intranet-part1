"use client";

import { useTransition } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  addJobCategoryAction,
  deleteJobCategoryAction,
  updateJobCategoryAction,
} from "@/features/jobs/actions";

type JobCat = {
  id: string;
  name: string;
  sortOrder: number;
};

export function JobCategoryManager({ categories }: { categories: JobCat[] }) {
  const [pending, start] = useTransition();

  return (
    <div className="space-y-6">
      <form
        className="flex flex-wrap gap-2"
        action={(fd) =>
          start(async () => {
            const r = await addJobCategoryAction(fd);
            if (r.error) toast.error(r.error);
            else toast.success("업무를 추가했습니다.");
          })
        }
      >
        <Input name="name" placeholder="새 업무 이름" className="max-w-xs" required />
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          추가
        </Button>
      </form>

      <ul className="divide-y rounded-lg border">
        {categories.map((c) => (
          <li key={c.id} className="flex flex-wrap items-center gap-2 px-3 py-2">
            <form
              className="flex flex-wrap items-center gap-2"
              action={(fd) =>
                start(async () => {
                  const r = await updateJobCategoryAction(fd);
                  if (r.error) toast.error(r.error);
                  else toast.success("저장했습니다.");
                })
              }
            >
              <input type="hidden" name="id" value={c.id} />
              <Input name="name" defaultValue={c.name} className="h-9 w-48" required />
              <Button type="submit" size="sm" variant="outline" disabled={pending}>
                저장
              </Button>
            </form>
            <form
              action={(fd) =>
                start(async () => {
                  if (!window.confirm(`「${c.name}」을(를) 삭제할까요?`)) return;
                  const r = await deleteJobCategoryAction(fd);
                  if (r.error) toast.error(r.error);
                  else toast.success("삭제했습니다.");
                })
              }
            >
              <input type="hidden" name="id" value={c.id} />
              <Button type="submit" size="sm" variant="ghost" disabled={pending}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
