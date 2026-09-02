import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { canWriteBoard } from "@/features/board/permissions";
import { getBoardByKey } from "@/features/board/queries";
import { PostForm } from "@/features/board/components/post-form";
import { prisma } from "@/lib/prisma";

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

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { phone: true },
  });

  return (
    <div>
      <PageHeader
        title={`${board.name} - ${key === "schedule" ? "일정 등록" : "글쓰기"}`}
        description={
          key === "schedule"
            ? "시작·종료 일시를 지정해 일정을 등록합니다."
            : "작성 중 내용은 자동 임시저장됩니다."
        }
      />
      <Card>
        <CardContent className="pt-6">
          <PostForm
            mode="create"
            boardKey={board.key}
            categories={board.categories}
            authorPhone={dbUser?.phone}
          />
        </CardContent>
      </Card>
    </div>
  );
}
