import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { canWriteBoard } from "@/features/board/permissions";
import { getBoardByKey } from "@/features/board/queries";
import { PostForm } from "@/features/board/components/post-form";
import { listProductCategoriesFlat } from "@/features/products/category-actions";

export const metadata: Metadata = { title: "글쓰기" };

async function formCategories(boardKey: string, boardCategories: string[]) {
  if (boardKey !== "products") return boardCategories;
  const flat = await listProductCategoriesFlat(boardKey);
  const names = flat.map((c) => c.name);
  return [...boardCategories, ...names.filter((n) => !boardCategories.includes(n))];
}

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

  const categories = await formCategories(board.key, board.categories);

  return (
    <div>
      <PageHeader
        title={`${board.name} - 글쓰기`}
        description="새 게시글을 작성합니다."
      />
      <Card>
        <CardContent className="pt-6">
          <PostForm mode="create" boardKey={board.key} categories={categories} />
        </CardContent>
      </Card>
    </div>
  );
}
