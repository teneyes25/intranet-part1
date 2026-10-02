import { randomUUID } from "node:crypto";

import type { KnowledgeChunk, KnowledgeJobRow } from "./types";

export type DocRow = {
  id: string;
  tenantId: string;
  title: string;
  sequence: number;
  approvedVersionId: string | null;
  activeVersionId: string | null;
  revoked: boolean;
  aclRevision: number;
  aclAt: Date | null;
  processingStatus: string;
  stateRevision: number;
};

export type DocPatch = {
  title?: string;
  sequence?: number;
  approvedVersionId?: string | null;
  activeVersionId?: string | null;
  revoked?: boolean;
  aclRevision?: number;
  aclAt?: Date | null;
  processingStatus?: string;
};

export type VersionRow = {
  id: string;
  tenantId: string;
  documentId: string;
  filename: string;
  mimeType: string;
  size: number;
  sha256: string;
  storageKey: string;
  previewKey: string | null;
  attachmentId: string | null;
  status: string;
  chunks: KnowledgeChunk[] | null;
  indexGeneration: number;
  indexedAt: Date | null;
};

export type EventRow = {
  id: string;
  fingerprint: string;
  documentId: string;
  sequence: number;
  type: string;
  versionId: string | null;
};

export interface SqlExecutor {
  query<T = Record<string, unknown>>(
    sql: string,
    params?: unknown[],
  ): Promise<T[]>;
  execute(sql: string, params?: unknown[]): Promise<number>;
  transaction<T>(fn: (tx: SqlExecutor) => Promise<T>): Promise<T>;
}

export interface KnowledgeRepository {
  transaction<T>(fn: (repo: KnowledgeRepository) => Promise<T>): Promise<T>;
  getDoc(
    tenantId: string,
    documentId: string,
    forUpdate?: boolean,
  ): Promise<DocRow | null>;
  insertDoc(doc: Pick<DocRow, "id" | "tenantId" | "title">): Promise<DocRow>;
  patchDoc(
    tenantId: string,
    documentId: string,
    expectedRevision: number,
    patch: DocPatch,
  ): Promise<DocRow | null>;
  insertVersion(row: VersionRow): Promise<void>;
  getVersion(
    tenantId: string,
    documentId: string,
    versionId: string,
  ): Promise<VersionRow | null>;
  saveVersion(row: VersionRow): Promise<void>;
  markVersionFailed(
    tenantId: string,
    documentId: string,
    versionId: string,
  ): Promise<void>;
  replaceAcls(
    tenantId: string,
    documentId: string,
    revision: number,
    groups: string[],
  ): Promise<void>;
  getAclGroups(
    tenantId: string,
    documentId: string,
    revision: number,
  ): Promise<string[]>;
  getEvent(tenantId: string, eventId: string): Promise<EventRow | null>;
  insertEvent(row: {
    id: string;
    tenantId: string;
    documentId: string;
    sequence: number;
    type: string;
    versionId?: string;
    aclRevision?: number;
    fingerprint: string;
    payload: unknown;
  }): Promise<void>;
  insertJob(row: {
    id?: string;
    eventId: string;
    tenantId: string;
    documentId: string;
    type: string;
    versionId?: string | null;
    maxAttempts?: number;
  }): Promise<string>;
  listJobs(filter?: { status?: string; tenantId?: string }): Promise<KnowledgeJobRow[]>;
  saveJob(row: KnowledgeJobRow): Promise<void>;
  claimNextJob(
    tenantId: string,
    workerId: string,
    now: Date,
    leaseUntil: Date,
  ): Promise<KnowledgeJobRow | null>;
  finishJob(
    jobId: string,
    leaseOwner: string,
    patch: {
      status: string;
      attempts: number;
      nextRetryAt: Date | null;
      lastError: string | null;
      completedAt: Date | null;
    },
  ): Promise<boolean>;
  reclaimExpiredJobs(tenantId: string, now: Date): Promise<number>;
  listDocumentIds(tenantId: string): Promise<string[]>;
  listStaffGroups(tenantId: string, userId: string): Promise<string[]>;
  replaceStaffGroups(
    tenantId: string,
    userId: string,
    groups: string[],
  ): Promise<void>;
}

const DOC_COLUMNS: Record<keyof DocPatch, string> = {
  title: "title",
  sequence: "sequence",
  approvedVersionId: "approvedVersionId",
  activeVersionId: "activeVersionId",
  revoked: "revoked",
  aclRevision: "aclRevision",
  aclAt: "aclAt",
  processingStatus: "processingStatus",
};

function asDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  return new Date(String(value));
}

function parseChunks(raw: unknown): KnowledgeChunk[] | null {
  if (!raw) return null;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as KnowledgeChunk[];
    } catch {
      return null;
    }
  }
  return raw as KnowledgeChunk[];
}

function mapDoc(r: Record<string, unknown>): DocRow {
  return {
    id: String(r.id),
    tenantId: String(r.tenantId),
    title: String(r.title),
    sequence: Number(r.sequence),
    approvedVersionId: r.approvedVersionId ? String(r.approvedVersionId) : null,
    activeVersionId: r.activeVersionId ? String(r.activeVersionId) : null,
    revoked: Boolean(r.revoked),
    aclRevision: Number(r.aclRevision),
    aclAt: asDate(r.aclAt),
    processingStatus: String(r.processingStatus),
    stateRevision: Number(r.stateRevision ?? 0),
  };
}

function mapVersion(r: Record<string, unknown>): VersionRow {
  return {
    id: String(r.id),
    tenantId: String(r.tenantId),
    documentId: String(r.documentId),
    filename: String(r.filename),
    mimeType: String(r.mimeType),
    size: Number(r.size),
    sha256: String(r.sha256),
    storageKey: String(r.storageKey),
    previewKey: r.previewKey ? String(r.previewKey) : null,
    attachmentId: r.attachmentId ? String(r.attachmentId) : null,
    status: String(r.status),
    chunks: parseChunks(r.chunks),
    indexGeneration: Number(r.indexGeneration),
    indexedAt: asDate(r.indexedAt),
  };
}

function mapJob(r: Record<string, unknown>): KnowledgeJobRow {
  return {
    id: String(r.id),
    eventId: String(r.eventId),
    tenantId: String(r.tenantId),
    documentId: String(r.documentId),
    type: String(r.type),
    versionId: r.versionId ? String(r.versionId) : null,
    status: String(r.status),
    attempts: Number(r.attempts),
    maxAttempts: Number(r.maxAttempts ?? 5),
    lastError: r.lastError ? String(r.lastError) : null,
    nextRetryAt: asDate(r.nextRetryAt),
    leaseOwner: r.leaseOwner ? String(r.leaseOwner) : null,
    leaseUntil: asDate(r.leaseUntil),
    completedAt: asDate(r.completedAt),
  };
}

export class SqlKnowledgeRepository implements KnowledgeRepository {
  constructor(private readonly db: SqlExecutor) {}

  transaction<T>(fn: (repo: KnowledgeRepository) => Promise<T>): Promise<T> {
    return this.db.transaction((tx) => fn(new SqlKnowledgeRepository(tx)));
  }

  async getDoc(tenantId: string, documentId: string, forUpdate = false) {
    const rows = await this.db.query(
      `SELECT * FROM "knowledge_documents" WHERE "tenantId"=$1 AND "id"=$2${
        forUpdate ? " FOR UPDATE" : ""
      }`,
      [tenantId, documentId],
    );
    return rows[0] ? mapDoc(rows[0] as Record<string, unknown>) : null;
  }

  async insertDoc(doc: Pick<DocRow, "id" | "tenantId" | "title">) {
    await this.db.execute(
      `INSERT INTO "knowledge_documents" ("id","tenantId","title","processingStatus","stateRevision")
       VALUES ($1,$2,$3,'STORED',0)`,
      [doc.id, doc.tenantId, doc.title],
    );
    const created = await this.getDoc(doc.tenantId, doc.id);
    if (!created) throw new Error("document insert failed");
    return created;
  }

  async patchDoc(
    tenantId: string,
    documentId: string,
    expectedRevision: number,
    patch: DocPatch,
  ) {
    const sets = [
      `"stateRevision" = "stateRevision" + 1`,
      `"updatedAt" = CURRENT_TIMESTAMP`,
    ];
    const params: unknown[] = [];
    for (const key of Object.keys(DOC_COLUMNS) as (keyof DocPatch)[]) {
      if (!Object.prototype.hasOwnProperty.call(patch, key)) continue;
      params.push(patch[key] ?? null);
      sets.push(`"${DOC_COLUMNS[key]}" = $${params.length}`);
    }
    params.push(tenantId, documentId, expectedRevision);
    const tenantParam = params.length - 2;
    const idParam = params.length - 1;
    const revisionParam = params.length;
    const rows = await this.db.query(
      `UPDATE "knowledge_documents" SET ${sets.join(", ")}
       WHERE "tenantId"=$${tenantParam} AND "id"=$${idParam} AND "stateRevision"=$${revisionParam}
       RETURNING *`,
      params,
    );
    return rows[0] ? mapDoc(rows[0] as Record<string, unknown>) : null;
  }

  async insertVersion(row: VersionRow) {
    await this.db.execute(
      `INSERT INTO "knowledge_document_versions"
        ("id","tenantId","documentId","filename","mimeType","size","sha256",
         "storageKey","previewKey","attachmentId","status","chunks","indexGeneration","indexedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13,$14)`,
      [
        row.id,
        row.tenantId,
        row.documentId,
        row.filename,
        row.mimeType,
        row.size,
        row.sha256,
        row.storageKey,
        row.previewKey,
        row.attachmentId,
        row.status,
        row.chunks ? JSON.stringify(row.chunks) : null,
        row.indexGeneration,
        row.indexedAt,
      ],
    );
  }

  async getVersion(tenantId: string, documentId: string, versionId: string) {
    const rows = await this.db.query(
      `SELECT * FROM "knowledge_document_versions"
        WHERE "tenantId"=$1 AND "documentId"=$2 AND "id"=$3`,
      [tenantId, documentId, versionId],
    );
    return rows[0] ? mapVersion(rows[0] as Record<string, unknown>) : null;
  }

  async saveVersion(row: VersionRow) {
    const rows = await this.db.query(
      `UPDATE "knowledge_document_versions" SET
         "status"=$4, "chunks"=$5::jsonb, "indexGeneration"=$6, "indexedAt"=$7
       WHERE "tenantId"=$1 AND "documentId"=$2 AND "id"=$3
       RETURNING "id"`,
      [
        row.tenantId,
        row.documentId,
        row.id,
        row.status,
        row.chunks ? JSON.stringify(row.chunks) : null,
        row.indexGeneration,
        row.indexedAt,
      ],
    );
    if (!rows[0]) throw new Error("version not stored");
  }

  async markVersionFailed(tenantId: string, documentId: string, versionId: string) {
    await this.db.execute(
      `UPDATE "knowledge_document_versions" SET "status"='FAILED'
       WHERE "tenantId"=$1 AND "documentId"=$2 AND "id"=$3 AND "status" <> 'READY'`,
      [tenantId, documentId, versionId],
    );
  }

  async replaceAcls(
    tenantId: string,
    documentId: string,
    revision: number,
    groups: string[],
  ) {
    await this.db.execute(
      `DELETE FROM "knowledge_document_acls" WHERE "tenantId"=$1 AND "documentId"=$2`,
      [tenantId, documentId],
    );
    for (const group of groups) {
      await this.db.execute(
        `INSERT INTO "knowledge_document_acls"
          ("id","tenantId","documentId","principalType","principalId","revision")
         VALUES ($1,$2,$3,'group',$4,$5)`,
        [randomUUID(), tenantId, documentId, group, revision],
      );
    }
  }

  async getAclGroups(tenantId: string, documentId: string, revision: number) {
    const rows = await this.db.query<{ principalId: string }>(
      `SELECT "principalId" FROM "knowledge_document_acls"
        WHERE "tenantId"=$1 AND "documentId"=$2 AND "revision"=$3
          AND "principalType"='group'`,
      [tenantId, documentId, revision],
    );
    return rows.map((r) => r.principalId);
  }

  async getEvent(tenantId: string, eventId: string) {
    const rows = await this.db.query(
      `SELECT * FROM "knowledge_sync_events" WHERE "tenantId"=$1 AND "id"=$2`,
      [tenantId, eventId],
    );
    const r = rows[0] as Record<string, unknown> | undefined;
    if (!r) return null;
    return {
      id: String(r.id),
      fingerprint: String(r.fingerprint),
      documentId: String(r.documentId),
      sequence: Number(r.sequence),
      type: String(r.type),
      versionId: r.versionId ? String(r.versionId) : null,
    };
  }

  async insertEvent(row: {
    id: string;
    tenantId: string;
    documentId: string;
    sequence: number;
    type: string;
    versionId?: string;
    aclRevision?: number;
    fingerprint: string;
    payload: unknown;
  }) {
    await this.db.execute(
      `INSERT INTO "knowledge_sync_events"
        ("id","tenantId","documentId","sequence","type","versionId","aclRevision","fingerprint","payload")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)`,
      [
        row.id,
        row.tenantId,
        row.documentId,
        row.sequence,
        row.type,
        row.versionId ?? null,
        row.aclRevision ?? null,
        row.fingerprint,
        JSON.stringify(row.payload ?? {}),
      ],
    );
  }

  async insertJob(row: {
    id?: string;
    eventId: string;
    tenantId: string;
    documentId: string;
    type: string;
    versionId?: string | null;
    maxAttempts?: number;
  }) {
    const id = row.id ?? randomUUID();
    await this.db.execute(
      `INSERT INTO "knowledge_sync_jobs"
        ("id","eventId","tenantId","documentId","type","versionId","status","maxAttempts")
       VALUES ($1,$2,$3,$4,$5,$6,'PENDING',$7)`,
      [
        id,
        row.eventId,
        row.tenantId,
        row.documentId,
        row.type,
        row.versionId ?? null,
        row.maxAttempts ?? 5,
      ],
    );
    return id;
  }

  async listJobs(filter?: { status?: string; tenantId?: string }) {
    let sql = `SELECT * FROM "knowledge_sync_jobs"`;
    const params: unknown[] = [];
    const where: string[] = [];
    if (filter?.status) {
      params.push(filter.status);
      where.push(`"status"=$${params.length}`);
    }
    if (filter?.tenantId) {
      params.push(filter.tenantId);
      where.push(`"tenantId"=$${params.length}`);
    }
    if (where.length) sql += ` WHERE ${where.join(" AND ")}`;
    sql += ` ORDER BY "createdAt" ASC`;
    const rows = await this.db.query(sql, params);
    return rows.map((raw) => mapJob(raw as Record<string, unknown>));
  }

  async saveJob(row: KnowledgeJobRow) {
    await this.db.execute(
      `UPDATE "knowledge_sync_jobs" SET
         "status"=$2, "attempts"=$3, "nextRetryAt"=$4, "lastError"=$5,
         "completedAt"=$6, "leaseOwner"=$7, "leaseUntil"=$8, "versionId"=$9,
         "maxAttempts"=$10
       WHERE "id"=$1`,
      [
        row.id,
        row.status,
        row.attempts,
        row.nextRetryAt,
        row.lastError,
        row.completedAt,
        row.leaseOwner,
        row.leaseUntil,
        row.versionId,
        row.maxAttempts,
      ],
    );
  }

  async claimNextJob(tenantId: string, workerId: string, now: Date, leaseUntil: Date) {
    const rows = await this.db.query(
      `WITH next AS (
         SELECT "id" FROM "knowledge_sync_jobs"
         WHERE "tenantId"=$1
           AND "type"='INDEX'
           AND "attempts" < "maxAttempts"
           AND (
             ("status"='PENDING' AND ("nextRetryAt" IS NULL OR "nextRetryAt" <= $2))
             OR ("status"='FAILED' AND "nextRetryAt" IS NOT NULL AND "nextRetryAt" <= $2)
           )
         ORDER BY "createdAt" ASC, "id" ASC
         FOR UPDATE SKIP LOCKED
         LIMIT 1
       )
       UPDATE "knowledge_sync_jobs" AS job
       SET "status"='PROCESSING',
           "attempts"=job."attempts" + 1,
           "leaseOwner"=$3,
           "leaseUntil"=$4
       FROM next
       WHERE job."id" = next."id"
       RETURNING job.*`,
      [tenantId, now, workerId, leaseUntil],
    );
    return rows[0] ? mapJob(rows[0] as Record<string, unknown>) : null;
  }

  async finishJob(
    jobId: string,
    leaseOwner: string,
    patch: {
      status: string;
      attempts: number;
      nextRetryAt: Date | null;
      lastError: string | null;
      completedAt: Date | null;
    },
  ) {
    const rows = await this.db.query(
      `UPDATE "knowledge_sync_jobs" SET
         "status"=$3, "attempts"=$4, "nextRetryAt"=$5, "lastError"=$6,
         "completedAt"=$7, "leaseOwner"=NULL, "leaseUntil"=NULL
       WHERE "id"=$1 AND "leaseOwner"=$2 AND "status"='PROCESSING'
       RETURNING "id"`,
      [
        jobId,
        leaseOwner,
        patch.status,
        patch.attempts,
        patch.nextRetryAt,
        patch.lastError,
        patch.completedAt,
      ],
    );
    return Boolean(rows[0]);
  }

  async reclaimExpiredJobs(tenantId: string, now: Date) {
    const rows = await this.db.query(
      `UPDATE "knowledge_sync_jobs"
       SET "status"='PENDING', "leaseOwner"=NULL, "leaseUntil"=NULL
       WHERE "tenantId"=$1
         AND "status"='PROCESSING'
         AND ("leaseUntil" IS NULL OR "leaseUntil" <= $2)
       RETURNING "id"`,
      [tenantId, now],
    );
    return rows.length;
  }

  async listDocumentIds(tenantId: string) {
    const rows = await this.db.query<{ id: string }>(
      `SELECT "id" FROM "knowledge_documents" WHERE "tenantId"=$1`,
      [tenantId],
    );
    return rows.map((r) => r.id);
  }

  async listStaffGroups(tenantId: string, userId: string) {
    const rows = await this.db.query<{ groupId: string }>(
      `SELECT "groupId" FROM "knowledge_staff_groups"
        WHERE "tenantId"=$1 AND "userId"=$2
        ORDER BY "groupId" ASC`,
      [tenantId, userId],
    );
    return rows.map((r) => r.groupId);
  }

  async replaceStaffGroups(tenantId: string, userId: string, groups: string[]) {
    await this.db.execute(
      `DELETE FROM "knowledge_staff_groups" WHERE "tenantId"=$1 AND "userId"=$2`,
      [tenantId, userId],
    );
    for (const group of groups) {
      await this.db.execute(
        `INSERT INTO "knowledge_staff_groups" ("id","tenantId","userId","groupId")
         VALUES ($1,$2,$3,$4)`,
        [randomUUID(), tenantId, userId, group],
      );
    }
  }
}
