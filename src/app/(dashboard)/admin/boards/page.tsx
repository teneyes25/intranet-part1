import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/session";
import { listBoardsAdmin } from "@/features/boards-admin/queries";
import { BoardAdminList } from "@/features/boards-admin/components/board-admin-list";
import { BoardForm } from "@/features/boards-admin/components/board-form";

export const metadata: Metadata = { title: "게시판 관리" };

export default async function AdminBoardsPage() {
  await requireRole(["ADMIN"]);
  const boards = await listBoardsAdmin();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <PageHeader
          title="게시판 관리"
          description="게시판 생성·순서·카테고리·작성권한·메일함 설정"
        />
        <Button asChild variant="outline">
          <Link href="/admin/users">사용자 관리</Link>
        </Button>
      </div>

      <BoardAdminList boards={boards} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">새 게시판 만들기</CardTitle>
        </CardHeader>
        <CardContent>
          <BoardForm mode="create" />
        </CardContent>
      </Card>
    </div>
  );
}
