"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/session";
import { canManagePost } from "@/features/board/permissions";
import { sendNoticeContactSms } from "@/features/notifications/post-fanout";

export async function sendNoticeSmsAction(formData: FormData) {
  const user = await requireUser();
  const postId = String(formData.get("postId") ?? "");
  const senderPhone = String(formData.get("smsSenderPhone") ?? "").trim();

  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: {
      board: { select: { key: true, name: true } },
      author: { select: { id: true, name: true, phone: true } },
    },
  });
  if (!post || post.board.key !== "notices") {
    return { error: "공지사항 글만 발송할 수 있습니다." };
  }
  if (!canManagePost(user, post.authorId) && user.role !== "ADMIN") {
    return { error: "발송 권한이 없습니다." };
  }

  const result = await sendNoticeContactSms({
    postId: post.id,
    boardKey: post.board.key,
    title: post.title,
    authorId: post.authorId,
    authorName: post.author.name,
    contentHtml: post.content,
    senderPhone: senderPhone || post.author.phone,
  });

  revalidatePath(`/boards/notices/${post.id}`);
  return {
    ok: true as const,
    contactSent: result.contactSent,
    contactFailed: result.contactFailed,
    skippedNoPhone: result.skippedNoPhone,
  };
}
