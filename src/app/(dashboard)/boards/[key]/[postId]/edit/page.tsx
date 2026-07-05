import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { canManagePost } from "@/features/board/permissions";
import { getPostDetail } from "@/features/board/queries";
import { PostForm } from "@/features/board/components/post-form";
import { listProductCategoriesFlat } from "@/features/products/category-actions";

export const metadata: Metadata = { title: "글 수정" };

async function formCategories(boardKey: string, boardCategories: string[]) {
  if (boardKey !== "products") return boardCategories;
  const flat = await listProductCategoriesFlat(boardKey);
  const names = flat.map((c) => c.name);
  return [...boardCategories, ...names.filter((n) => !boardCategories.includes(n))];
}

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ key: string; postId: string }>;
}) {
  const { key, postId } = await params;
  const [user, post] = await Promise.all([
    requireUser(),
    getPostDetail(postId),
  ]);

  if (!post || post.board.key !== key) notFound();
  if (!canManagePost(user, post.authorId)) {
    redirect(`/boards/${key}/${postId}`);
  }

  const categories = await formCategories(post.board.key, post.board.categories);

  return (
    <div>
      <PageHeader title={`${post.board.name} - 글 수정`} />
      <Card>
        <CardContent className="pt-6">
          <PostForm
            mode="edit"
            boardKey={post.board.key}
            categories={categories}
            initial={{
              postId: post.id,
              title: post.title,
              content: post.content,
              category: post.category,
              price: post.price,
              saleStatus: post.saleStatus,
              attachments: post.attachments.map((a) => ({
                id: a.id,
                filename: a.filename,
                size: a.size,
              })),
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
