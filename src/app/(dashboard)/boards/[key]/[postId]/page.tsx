import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  Download,
  Eye,
  MessageSquare,
  Paperclip,
  Pencil,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { canManagePost } from "@/features/board/permissions";
import { getPostDetail, incrementViewCount } from "@/features/board/queries";
import {
  deletePostAction,
  deleteCommentAction,
} from "@/features/board/actions";
import { RichTextContent } from "@/features/board/components/rich-text-content";
import { PageLayoutRenderer } from "@/features/page-layout/components/layout-renderer";
import { getPostDetailPageLayoutForView } from "@/features/page-layout/service";
import { CommentForm } from "@/features/board/components/comment-form";
import { ConfirmDeleteForm } from "@/features/board/components/confirm-delete-form";
import { NoticeSmsPanel } from "@/features/board/components/notice-sms-panel";
import { formatDate, formatDateTime, formatFileSize } from "@/features/board/utils";
import {
  attachmentExpiresAt,
  isAttachmentExpired,
} from "@/features/board/constants";
import {
  AttachmentMeta,
  AttachmentVersionList,
} from "@/features/products/components/attachment-meta";
import { scrubNewsContentHtml } from "@/lib/news/summarize";

export const metadata: Metadata = { title: "게시글" };

export default async function PostDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ key: string; postId: string }>;
  searchParams?: Promise<{ sms?: string }>;
}) {
  const { key, postId } = await params;
  const sp = searchParams ? await searchParams : {};
  const user = await requireUser();
  const post = await getPostDetail(postId);
  if (!post || post.board.key !== key) notFound();

  const detailLayout = await getPostDetailPageLayoutForView(postId, key, user.dealerId);

  await incrementViewCount(postId);
  const canManage = canManagePost(user, post.authorId);
  const showSms =
    key === "notices" && (canManage || user.role === "ADMIN");

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href={`/boards/${key}`}>
          <ArrowLeft className="h-4 w-4" />
          {post.board.name} 목록
        </Link>
      </Button>

      {detailLayout?.html && detailLayout.isPublished && (
        <PageLayoutRenderer html={detailLayout.html} css={detailLayout.css} />
      )}

      {showSms && (
        <NoticeSmsPanel
          postId={post.id}
          authorPhone={post.author.phone}
          defaultOpen={sp.sms === "1"}
        />
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            {post.isPinned && <Badge variant="destructive">중요</Badge>}
            {post.category && <Badge variant="secondary">{post.category}</Badge>}
          </div>
          <CardTitle className="text-xl">{post.title}</CardTitle>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span>{post.author.name}</span>
            {post.startsAt && (
              <span className="inline-flex items-center gap-1 font-medium text-foreground">
                <CalendarDays className="h-3.5 w-3.5" />
                {formatDateTime(post.startsAt)}
                {post.endsAt ? ` ~ ${formatDateTime(post.endsAt)}` : null}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" />
              작성 {formatDateTime(post.createdAt)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" />
              {post.viewCount + 1}
            </span>
            <span className="inline-flex items-center gap-1">
              <MessageSquare className="h-3.5 w-3.5" />
              {post.comments.length}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <RichTextContent
            html={
              key === "news"
                ? scrubNewsContentHtml(post.content)
                : post.content
            }
            className="min-h-24"
          />

          {post.attachments.length > 0 && (
            <div className="space-y-2">
              <p className="flex items-center gap-1.5 text-sm font-medium">
                <Paperclip className="h-4 w-4" />
                첨부파일 ({post.attachments.length})
              </p>
              <ul className="space-y-1">
                {post.attachments.map((a) => {
                  const expired = isAttachmentExpired(a.createdAt);
                  const until = formatDate(attachmentExpiresAt(a.createdAt));
                  return (
                    <li key={a.id}>
                      {expired ? (
                        <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm text-muted-foreground">
                          <Download className="h-4 w-4 shrink-0" />
                          <span className="min-w-0 flex-1 truncate">
                            {a.filename}
                          </span>
                          <span className="shrink-0 text-xs">
                            다운로드 기간 만료 (1년)
                          </span>
                        </div>
                      ) : (
                        <>
                          <a
                            href={`/api/files/${a.id}`}
                            className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-muted/50"
                          >
                            <Download className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <span className="min-w-0 flex-1 truncate">
                              {a.filename}
                            </span>
                            {key === "products" && (
                              <AttachmentMeta
                                attachmentId={a.id}
                                currentVersion={a.currentVersion}
                              />
                            )}
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {formatFileSize(a.size)} · ~{until}
                            </span>
                          </a>
                          {key === "products" && (
                            <AttachmentVersionList attachmentId={a.id} />
                          )}
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {canManage && (
            <div className="flex justify-end gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href={`/boards/${key}/${post.id}/edit`}>
                  <Pencil className="h-4 w-4" />
                  수정
                </Link>
              </Button>
              <ConfirmDeleteForm
                action={deletePostAction}
                message="게시글을 삭제하시겠습니까?"
              >
                <input type="hidden" name="postId" value={post.id} />
                <Button type="submit" variant="destructive" size="sm">
                  <Trash2 className="h-4 w-4" />
                  삭제
                </Button>
              </ConfirmDeleteForm>
            </div>
          )}
        </CardContent>
      </Card>

      {post.board.allowComments && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              댓글 {post.comments.length}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {post.comments.length > 0 && (
              <ul className="space-y-3">
                {post.comments.map((c) => (
                  <li key={c.id}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium">{c.author.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(c.createdAt)}
                        </span>
                      </div>
                      {canManagePost(user, c.authorId) && (
                        <ConfirmDeleteForm
                          action={deleteCommentAction}
                          message="댓글을 삭제하시겠습니까?"
                        >
                          <input
                            type="hidden"
                            name="commentId"
                            value={c.id}
                          />
                          <button
                            type="submit"
                            className="text-xs text-muted-foreground hover:text-destructive"
                          >
                            삭제
                          </button>
                        </ConfirmDeleteForm>
                      )}
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm">
                      {c.content}
                    </p>
                    <Separator className="mt-3" />
                  </li>
                ))}
              </ul>
            )}
            <CommentForm postId={post.id} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
