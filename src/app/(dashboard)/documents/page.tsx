import type { Metadata } from "next";
import Link from "next/link";
import {
  FileText,
  FolderOpen,
  Settings2,
  Shield,
  Clock,
} from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import {
  ensureDefaultDocumentBoxes,
  isDocumentBoxManager,
  listDocumentBoxes,
} from "@/features/documents/box-service";
import { canManageDocumentBoxes } from "@/features/documents/permissions";
import { DOCUMENT_POST_CATEGORIES } from "@/features/documents/constants";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/features/board/utils";

export const metadata: Metadata = { title: "문서함" };

export default async function DocumentsPage() {
  const user = await requireUser();
  await ensureDefaultDocumentBoxes();

  const [boxes, designated, recent] = await Promise.all([
    listDocumentBoxes({ activeOnly: true }),
    isDocumentBoxManager(user.id),
    prisma.sharedDocument.findMany({
      include: { documentBox: true },
      orderBy: { updatedAt: "desc" },
      take: 8,
    }),
  ]);

  const canManage = canManageDocumentBoxes({
    role: user.role,
    isDesignatedManager: designated,
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title="문서함"
          description="경영·사규·시장·홍보 등 하위 게시판에서 기안문과 자료를 보관합니다. 전자결재 완료 문서는 지정된 문서함으로 자동 이동합니다."
        />
        {canManage && (
          <Button asChild variant="outline">
            <Link href="/admin/document-categories">
              <Settings2 className="h-4 w-4" />
              문서함 관리
            </Link>
          </Button>
        )}
      </div>

      {boxes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            등록된 문서함이 없습니다.
            {canManage && " 관리 메뉴에서 문서함을 먼저 생성하세요."}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {boxes.map((box) => {
            const href = box.board
              ? `/boards/${box.board.key}`
              : `/documents`;
            return (
              <Link key={box.id} href={href} className="group">
                <Card className="h-full transition-shadow group-hover:shadow-md">
                  <CardContent className="space-y-3 p-5">
                    <div className="flex items-start gap-3">
                      <div className="rounded-md bg-primary/10 p-2 text-primary">
                        <FolderOpen className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold leading-snug">{box.name}</h3>
                        {box.description && (
                          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                            {box.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {box.classification && (
                        <Badge variant="secondary" className="text-[10px]">
                          <Shield className="mr-1 h-3 w-3" />
                          {box.classification}
                          {box.classificationCode
                            ? ` · ${box.classificationCode}`
                            : ""}
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-[10px]">
                        <Clock className="mr-1 h-3 w-3" />
                        {box.retentionDays
                          ? `${box.retentionDays}일 보존`
                          : "영구 보존"}
                      </Badge>
                      {DOCUMENT_POST_CATEGORIES.map((c) => (
                        <Badge key={c} variant="outline" className="text-[10px]">
                          {c}
                        </Badge>
                      ))}
                    </div>

                    <p className="text-xs text-muted-foreground">
                      보관 문서 {box._count.documents}건 · 연결 결재{" "}
                      {box._count.approvals}건
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {recent.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold">최근 보관 문서</h3>
          <div className="divide-y rounded-lg border">
            {recent.map((d) => {
              const href =
                d.url ??
                (d.boardKey && d.postId
                  ? `/boards/${d.boardKey}/${d.postId}`
                  : "/documents");
              return (
                <Link
                  key={d.id}
                  href={href}
                  className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
                >
                  <FileText className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-medium">{d.title}</p>
                      {d.docType && (
                        <Badge variant="secondary" className="text-[10px]">
                          {d.docType}
                        </Badge>
                      )}
                      {(d.documentBox?.name || d.category) && (
                        <Badge variant="outline" className="text-[10px]">
                          {d.documentBox?.name ?? d.category}
                        </Badge>
                      )}
                    </div>
                    {d.description && (
                      <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">
                        {d.description}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatDate(d.updatedAt)}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
