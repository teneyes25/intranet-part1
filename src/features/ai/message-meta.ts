import type { ChatSource } from "@/lib/ai/chat-types";
import type { NewsMindmapPayload } from "@/lib/news/mindmap-types";

export type AssistantMessageMeta = {
  articles?: ChatSource[];
  mindmap?: NewsMindmapPayload;
};

export function parseAssistantMeta(raw: unknown): {
  sources?: ChatSource[];
  mindmap?: NewsMindmapPayload;
} {
  if (!raw) return {};
  if (Array.isArray(raw)) {
    return { sources: raw as ChatSource[] };
  }
  if (typeof raw === "object") {
    const o = raw as AssistantMessageMeta & { sources?: ChatSource[] };
    if (o.mindmap || Array.isArray(o.articles)) {
      return {
        sources: Array.isArray(o.articles) ? o.articles : undefined,
        mindmap: o.mindmap,
      };
    }
    if (Array.isArray(o.sources)) {
      return { sources: o.sources };
    }
  }
  return {};
}

export function serializeAssistantMeta(
  sources?: ChatSource[],
  mindmap?: NewsMindmapPayload,
): AssistantMessageMeta | undefined {
  if (!sources?.length && !mindmap) return undefined;
  return {
    articles: sources ?? [],
    mindmap,
  };
}
