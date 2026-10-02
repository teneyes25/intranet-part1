/** Phase 1 dev bounds for text originals, stored chunks, and search payloads. */
export const DEFAULT_KNOWLEDGE_LIMITS = {
  maxOriginalBytes: 1_048_576,
  maxPreviewBytes: 1_048_576,
  maxChunks: 32,
  maxChunkChars: 4_000,
  maxSearchHits: 20,
  maxHitChars: 1_000,
  maxQueryChars: 200,
  maxAttempts: 5,
  leaseMs: 60_000,
};

export type KnowledgeLimits = typeof DEFAULT_KNOWLEDGE_LIMITS;
