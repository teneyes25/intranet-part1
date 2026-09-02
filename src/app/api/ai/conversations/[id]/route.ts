import { NextResponse, type NextRequest } from "next/server";

import {
  deleteConversation,
  getConversationDetail,
} from "@/features/ai/conversation-service";
import { withApiGuard } from "@/lib/security/api-guard";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  return withApiGuard({ tier: "ai" }, async (_req, { session }) => {
    const detail = await getConversationDetail(id, session!.user.id);
    if (!detail) {
      return NextResponse.json(
        { error: "대화를 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      conversation: {
        id: detail.id,
        title: detail.title ?? "새 대화",
        updatedAt: detail.updatedAt.toISOString(),
      },
      messages: detail.messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        sources: m.sources ?? undefined,
        createdAt: m.createdAt.toISOString(),
      })),
    });
  })(req);
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  return withApiGuard({ tier: "ai" }, async (_req, { session }) => {
    const ok = await deleteConversation(id, session!.user.id);
    if (!ok) {
      return NextResponse.json(
        { error: "대화를 찾을 수 없습니다." },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true });
  })(req);
}
