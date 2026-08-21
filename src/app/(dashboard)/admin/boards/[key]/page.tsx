import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/session";
import {
  getBoardAdmin,
  listBoardMailboxStats,
} from "@/features/boards-admin/queries";
import { BoardForm } from "@/features/boards-admin/components/board-form";
import { MailboxAdminPanel } from "@/features/boards-admin/components/mailbox-admin-panel";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/features/board/utils";
import { AdminDeletePostButton } from "@/features/boards-admin/components/admin-delete-post-button";

export const metadata: Metadata = { title: "게시판 수정" };

export default async function AdminBoardDetailPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  await requireRole(["ADMIN"]);
  const { key } = await params;
  const board = await getBoardAdmin(key);
  if (!board) notFound();

  const [mailbox, recentPosts] = await Promise.all([
    listBoardMailboxStats(board.id),
    prisma.post.findMany({
      where: { boardId: board.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        title: true,
        category: true,
        createdAt: true,
        author: { select: { name: true } },
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/admin/boards">
          <ArrowLeft className="h-4 w-4" />
          게시판 목록
        </Link>
      </Button>

      <PageHeader
        title={`${board.name} 설정`}
        description={`키: ${board.key} · 게시글 ${board._count.posts}건`}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">기본·카테고리</CardTitle>
          </CardHeader>
          <CardContent>
            <BoardForm
              mode="edit"
              initialBoard={{
                key: board.key,
                name: board.name,
                description: board.description,
                categories: board.categories,
                writeRoles: board.writeRoles,
                allowComments: board.allowComments,
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">메일함</CardTitle>
          </CardHeader>
          <CardContent>
            <MailboxAdminPanel
              boardKey={board.key}
              trashed={mailbox.trashed}
              folders={mailbox.folders}
              labels={mailbox.labels}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">최근 게시글</CardTitle>
          <Button asChild size="sm" variant="outline">
            <Link href={`/boards/${board.key}`}>게시판 열기</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recentPosts.length === 0 ? (
            <p className="text-sm text-muted-foreground">게시글 없음</p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {recentPosts.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/boards/${board.key}/${p.id}`}
                      className="truncate font-medium hover:underline"
                    >
                      {p.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {p.author.name} · {formatDate(p.createdAt)}
                      {p.category ? ` · ${p.category}` : ""}
                    </p>
                  </div>
                  <AdminDeletePostButton
                    boardKey={board.key}
                    postId={p.id}
                  />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
