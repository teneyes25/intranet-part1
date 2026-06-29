import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LayoutGrid, PenSquare } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { requireUser } from "@/lib/auth/session";
import { canAccessBoard } from "@/lib/auth/access";
import { canWriteBoard } from "@/features/board/permissions";
import { getBoardByKey } from "@/features/board/queries";
import { MailboxShell } from "@/features/board-mailbox/components/mailbox-shell";
import {
  getCustomFolders,
  getMailboxCounts,
  getUserLabels,
  listMailboxPosts,
} from "@/features/board-mailbox/queries";
interface PageProps {
  params: Promise<{ key: string }>;
  searchParams: Promise<{
    folder?: string;
    label?: string;
    q?: string;
    page?: string;
  }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { key } = await params;
  const board = await getBoardByKey(key);
  return { title: board ? `${board.name} · 메일함` : "게시판 메일함" };
}

export default async function BoardMailboxPage({ params, searchParams }: PageProps) {
  const { key } = await params;
  const sp = await searchParams;

  const [user, board] = await Promise.all([requireUser(), getBoardByKey(key)]);
  if (!board) notFound();
  if (!canAccessBoard(user.role, key)) notFound();

  const folder = sp.folder ?? "inbox";
  const page = Number(sp.page ?? "1") || 1;

  const [counts, customFolders, labels, result] = await Promise.all([
    getMailboxCounts(user.id, board.id, user.role),
    getCustomFolders(user.id, board.id),
    getUserLabels(user.id, board.id),
    listMailboxPosts({
      userId: user.id,
      boardId: board.id,
      role: user.role,
      folder,
      labelId: sp.label,
      q: sp.q,
      page,
    }),
  ]);

  const canWrite = canWriteBoard(user.role, board.writeRoles);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <PageHeader
          eyebrow="Board Mailbox"
          title={`${board.name} 메일함`}
          description="Gmail 스타일 폴더·라벨로 게시글을 정리하세요. 게시글을 드래그해 폴더로 이동할 수 있습니다."
        />
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/boards/${board.key}`}>
              <LayoutGrid className="h-4 w-4" />
              일반 보기
            </Link>
          </Button>
          {canWrite && (
            <Button asChild size="sm">
              <Link href={`/boards/${board.key}/new`}>
                <PenSquare className="h-4 w-4" />
                글쓰기
              </Link>
            </Button>
          )}
        </div>
      </div>

      <MailboxShell
        boardKey={board.key}
        folder={folder}
        labelId={sp.label}
        counts={counts}
        customFolders={customFolders}
        labels={labels}
        items={result.items}
        total={result.total}
        page={result.page}
        totalPages={result.totalPages}
      />
    </div>
  );
}
