import { NextResponse } from "next/server";

import {
  createEmptyConversation,
  listUserConversations,
} from "@/features/ai/conversation-service";
import { withApiGuard } from "@/lib/security/api-guard";

export const runtime = "nodejs";

export const GET = withApiGuard({ tier: "ai" }, async (_req, { session }) => {
  const items = await listUserConversations(session!.user.id);
  return NextResponse.json({
    conversations: items.map((c) => ({
      id: c.id,
      title: c.title ?? "새 대화",
      updatedAt: c.updatedAt.toISOString(),
      createdAt: c.createdAt.toISOString(),
      messageCount: c._count.messages,
    })),
  });
});

export const POST = withApiGuard({ tier: "ai" }, async (_req, { session }) => {
  const conv = await createEmptyConversation(session!.user.id);
  return NextResponse.json({
    conversation: {
      id: conv.id,
      title: conv.title ?? "새 대화",
      updatedAt: conv.updatedAt.toISOString(),
      messageCount: 0,
    },
  });
});
