import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { canWriteBoard } from "@/features/board/permissions";
import { getBoardByKey } from "@/features/board/queries";
import { PostForm } from "@/features/board/components/post-form";

export const metadata: Metadata = { title: "글쓰기" };

export default async function NewPostPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  const [user, board] = await Promise.all([requireUser(), getBoardByKey(key)]);
  if (!board) notFound();

  if (!canWriteBoard(user.role, board.writeRoles)) {
    redirect(`/boards/${board.key}`);
  }

  return (
    <div>
      <PageHeader
        title={`${board.name} - ${key === "schedule" ? "일정 등록" : "글쓰기"}`}
        description={
          key === "schedule"
            ? "시작·종료 일시를 지정해 일정을 등록합니다."
            : "새 게시글을 작성합니다."
        }
      />
      <Card>
        <CardContent className="pt-6">
          <PostForm
            mode="create"
            boardKey={board.key}
            categories={board.categories}
          />
        </CardContent>
      </Card>
    </div>
  );
}
