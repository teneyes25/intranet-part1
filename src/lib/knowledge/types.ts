export type SyncServiceContext = {
  kind: "sync-service";
  tenantId: string;
};

export type UserContext = {
  kind: "user";
  tenantId: string;
  userId: string;
  active: boolean;
  groups: string[];
};

export type KnowledgeContext = SyncServiceContext | UserContext;

export type KnowledgeEventType = "APPROVE" | "ACL" | "REVOKE";

export type KnowledgeEvent = {
  eventId: string;
  documentId: string;
  sequence: number;
  type: KnowledgeEventType;
  versionId?: string;
  allowedGroups?: string[];
};

export type KnowledgeChunk = {
  chunkId: string;
  content: string;
  locator: { paragraph: number };
};

export type KnowledgeSearchHit = {
  documentId: string;
  title: string;
  versionId: string;
  hash: string;
  chunkId: string;
  content: string;
  locator: { paragraph: number };
  indexedAt: number | null;
  aclAt: number | null;
};

export type KnowledgeJobRow = {
  id: string;
  eventId: string;
  tenantId: string;
  documentId: string;
  type: string;
  versionId: string | null;
  status: string;
  attempts: number;
  maxAttempts: number;
  lastError: string | null;
  nextRetryAt: Date | null;
  leaseOwner: string | null;
  leaseUntil: Date | null;
  completedAt: Date | null;
};
