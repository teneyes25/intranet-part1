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
import {
  getPostDetail,
  getRelatedPosts,
  incrementViewCount,
} from "@/features/board/queries";
import {
  deletePostAction,
  deleteCommentAction,
} from "@/features/board/actions";
import { RichTextContent } from "@/features/board/components/rich-text-content";
import { PostReadModeToggle } from "@/features/board/components/post-read-mode";
import { PostImageGallery } from "@/features/board/components/post-image-gallery";
import { RelatedPosts } from "@/features/board/components/related-posts";
import { PageLayoutRenderer } from "@/features/page-layout/components/layout-renderer";
import { getPostDetailPageLayoutForView } from "@/features/page-layout/service";
import { CommentForm } from "@/features/board/components/comment-form";
import { ConfirmDeleteForm } from "@/features/board/components/confirm-delete-form";
import { formatDateTime, formatFileSize } from "@/features/board/utils";
import {
  AttachmentMeta,
  AttachmentVersionList,
} from "@/features/products/components/attachment-meta";
import { ProductDetailMeta } from "@/features/products/components/product-detail-meta";
import { getProductMetaForPost } from "@/features/products/product-meta";
import { AnabadaDetailPanel } from "@/features/anabada/components/anabada-detail-panel";

export const metadata: Metadata = { title: "게시글" };

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ key: string; postId: string }>;
}) {
  const { key, postId } = await params;
  const user = await requireUser();
  const post = await getPostDetail(postId);
  if (!post || post.board.key !== key) notFound();

  const [detailLayout, related, productMeta] = await Promise.all([
    getPostDetailPageLayoutForView(postId, key, user.dealerId),
    getRelatedPosts(post.boardId, post.id, post.category),
    key === "products" ? getProductMetaForPost(postId) : Promise.resolve(null),
  ]);

  await incrementViewCount(postId);
  const canManage = canManagePost(user, post.authorId);

  const isProduct = key === "products";
  const isAnabada = key === "anabada";
  const isSchedule = key === "schedule";

  const imageAttachments = post.attachments
    .filter((a) => a.mimeType.startsWith("image/"))
    .map((a) => ({
      id: a.id,
      filename: a.filename,
      url: `/api/files/${a.id}`,
    }));

  const fileAttachments = post.attachments.filter(
    (a) => !a.mimeType.startsWith("image/"),
  );

  return (
    <div
      className={
        isProduct || isAnabada
          ? "mx-auto max-w-5xl page-shell space-y-5"
          : "mx-auto max-w-3xl page-shell space-y-5"
      }
    >
      <Button asChild variant="ghost" size="sm" className="-ml-2 min-h-10 text-muted-foreground touch-target-sm">
        <Link href={`/boards/${key}`}>
          <ArrowLeft className="h-4 w-4" />
          {post.board.name} 목록
        </Link>
      </Button>

      {detailLayout?.html && detailLayout.isPublished && (
        <div className={isProduct ? "overflow-hidden rounded-2xl border border-border/70 shadow-card" : ""}>
          <PageLayoutRenderer html={detailLayout.html} css={detailLayout.css} />
        </div>
      )}

      {isAnabada && (
        <AnabadaDetailPanel
          postId={post.id}
          boardKey={key}
          title={post.title}
          price={post.price}
          saleStatus={post.saleStatus}
          authorName={post.author.name}
        />
      )}

      {imageAttachments.length > 0 && (
        <PostImageGallery images={imageAttachments} />
      )}

      {isProduct && productMeta && <ProductDetailMeta meta={productMeta} />}

      <Card className={isProduct || isAnabada ? "overflow-hidden border-border/70 shadow-elevated" : ""}>
        <CardHeader className={isProduct || isAnabada ? "border-b border-border/50 bg-gradient-to-br from-muted/40 to-card pb-6" : ""}>
          <div className="flex flex-wrap items-center gap-2">
            {post.isPinned && <Badge variant="destructive">중요</Badge>}
            {post.category && <Badge variant="secondary">{post.category}</Badge>}
            {isProduct && <Badge className="bg-primary/10 text-primary hover:bg-primary/15">상품</Badge>}
            {isSchedule && post.eventStart && (
              <Badge variant="outline">
                {new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium" }).format(
                  new Date(post.eventStart),
                )}
                {post.eventEnd &&
                  ` ~ ${new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium" }).format(new Date(post.eventEnd))}`}
              </Badge>
            )}
          </div>
          <CardTitle className={isProduct || isAnabada ? "text-2xl md:text-3xl" : "text-xl"}>
            {post.title}
          </CardTitle>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span>{post.author.name}</span>
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" />
              {formatDateTime(post.createdAt)}
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
          <PostReadModeToggle>
            <RichTextContent html={post.content} className="min-h-24" />
          </PostReadModeToggle>

          {fileAttachments.length > 0 && (
            <div className="space-y-2">
              <p className="flex items-center gap-1.5 text-sm font-medium">
                <Paperclip className="h-4 w-4" />
                첨부파일 ({fileAttachments.length})
              </p>
              <ul className="space-y-1">
                {fileAttachments.map((a) => (
                  <li key={a.id}>
                    <a
                      href={`/api/files/${a.id}`}
                      className="flex min-h-11 items-center gap-2 rounded-lg border border-border/70 bg-card px-3 py-2.5 text-sm shadow-xs transition-all hover:border-primary/25 hover:bg-muted/40 active:scale-[0.99]"
                    >
                      <Download className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate">{a.filename}</span>
                      {key === "products" && (
                        <AttachmentMeta
                          attachmentId={a.id}
                          currentVersion={a.currentVersion}
                        />
                      )}
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatFileSize(a.size)}
                      </span>
                    </a>
                    {key === "products" && (
                      <AttachmentVersionList attachmentId={a.id} />
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {canManage && (
            <div className="flex flex-wrap justify-end gap-2">
              <Button asChild variant="outline" size="sm" className="min-h-10 touch-target-sm">
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
                <Button type="submit" variant="destructive" size="sm" className="min-h-10 touch-target-sm">
                  <Trash2 className="h-4 w-4" />
                  삭제
                </Button>
              </ConfirmDeleteForm>
            </div>
          )}
        </CardContent>
      </Card>

      <RelatedPosts
        boardKey={key}
        boardName={post.board.name}
        items={related}
      />

      {post.board.allowComments && (
        <Card id="comments">
          <CardHeader>
            <CardTitle className="text-base">
              댓글 {post.comments.length}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {post.comments.length > 0 && (
              <ul className="space-y-3">
                {post.comments.map((c) => (
                  <li key={c.id} className="rounded-lg border border-border/50 p-3">
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
                            className="min-h-8 px-2 text-xs text-muted-foreground hover:text-destructive"
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
