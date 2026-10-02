import "server-only";

import { isKnowledgeV1Enabled } from "./flags";

/**
 * Optional hook from existing approval completion.
 * No-op unless KNOWLEDGE_V1_ENABLED=true. Does not change approval outcome.
 */
export async function maybeRecordKnowledgeApproval(input: {
  sourceId: string;
  title: string;
  attachmentId?: string;
}): Promise<void> {
  if (!isKnowledgeV1Enabled()) return;
  void input;
  // Phase 1 does not auto-ingest existing approval binaries.
  // Operators upload + approve through KnowledgeService with a sync-service context.
}
