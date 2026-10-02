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
};

export interface SqlExecutor {
  query<T = Record<string, unknown>>(
    sql: string,
    params?: unknown[],
  ): Promise<T[]>;
  execute(sql: string, params?: unknown[]): Promise<void>;
  transaction<T>(fn: (tx: SqlExecutor) => Promise<T>): Promise<T>;
}

export interface KnowledgeRepository {
  transaction<T>(fn: (repo: KnowledgeRepository) => Promise<T>): Promise<T>;
  getDoc(tenantId: string, documentId: string): Promise<DocRow | null>;
  insertDoc(doc: Pick<DocRow, "id" | "tenantId" | "title">): Promise<DocRow>;
  saveDoc(doc: DocRow): Promise<void>;
  insertVersion(row: VersionRow): Promise<void>;
  getVersion(versionId: string): Promise<VersionRow | null>;
  saveVersion(row: VersionRow): Promise<void>;
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
  }): Promise<string>;
  listJobs(filter?: { status?: string; tenantId?: string }): Promise<KnowledgeJobRow[]>;
  saveJob(row: KnowledgeJobRow): Promise<void>;
  resetProcessingToPending(): Promise<number>;
  listDocumentIds(tenantId: string): Promise<string[]>;
}

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

export class SqlKnowledgeRepository implements KnowledgeRepository {
  constructor(private readonly db: SqlExecutor) {}

  transaction<T>(fn: (repo: KnowledgeRepository) => Promise<T>): Promise<T> {
    return this.db.transaction((tx) => fn(new SqlKnowledgeRepository(tx)));
  }

  async getDoc(tenantId: string, documentId: string) {
    const rows = await this.db.query(
      `SELECT * FROM "knowledge_documents" WHERE "tenantId"=$1 AND "id"=$2`,
      [tenantId, documentId],
    );
    return rows[0] ? mapDoc(rows[0] as Record<string, unknown>) : null;
  }

  async insertDoc(doc: Pick<DocRow, "id" | "tenantId" | "title">) {
    await this.db.execute(
      `INSERT INTO "knowledge_documents" ("id","tenantId","title","processingStatus")
       VALUES ($1,$2,$3,'STORED')`,
      [doc.id, doc.tenantId, doc.title],
    );
    const created = await this.getDoc(doc.tenantId, doc.id);
    if (!created) throw new Error("document insert failed");
    return created;
  }

  async saveDoc(doc: DocRow) {
    await this.db.execute(
      `UPDATE "knowledge_documents" SET
         "title"=$3, "sequence"=$4, "approvedVersionId"=$5, "activeVersionId"=$6,
         "revoked"=$7, "aclRevision"=$8, "aclAt"=$9, "processingStatus"=$10,
         "updatedAt"=CURRENT_TIMESTAMP
       WHERE "tenantId"=$1 AND "id"=$2`,
      [
        doc.tenantId,
        doc.id,
        doc.title,
        doc.sequence,
        doc.approvedVersionId,
        doc.activeVersionId,
        doc.revoked,
        doc.aclRevision,
        doc.aclAt,
        doc.processingStatus,
      ],
    );
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

  async getVersion(versionId: string) {
    const rows = await this.db.query(
      `SELECT * FROM "knowledge_document_versions" WHERE "id"=$1`,
      [versionId],
    );
    return rows[0] ? mapVersion(rows[0] as Record<string, unknown>) : null;
  }

  async saveVersion(row: VersionRow) {
    await this.db.execute(
      `UPDATE "knowledge_document_versions" SET
         "status"=$2, "chunks"=$3::jsonb, "indexGeneration"=$4, "indexedAt"=$5
       WHERE "id"=$1`,
      [
        row.id,
        row.status,
        row.chunks ? JSON.stringify(row.chunks) : null,
        row.indexGeneration,
        row.indexedAt,
      ],
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
  }) {
    const id = row.id ?? randomUUID();
    await this.db.execute(
      `INSERT INTO "knowledge_sync_jobs"
        ("id","eventId","tenantId","documentId","type","status")
       VALUES ($1,$2,$3,$4,$5,'PENDING')`,
      [id, row.eventId, row.tenantId, row.documentId, row.type],
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
    return rows.map((raw) => {
      const r = raw as Record<string, unknown>;
      return {
        id: String(r.id),
        eventId: String(r.eventId),
        tenantId: String(r.tenantId),
        documentId: String(r.documentId),
        type: String(r.type),
        status: String(r.status),
        attempts: Number(r.attempts),
        lastError: r.lastError ? String(r.lastError) : null,
        nextRetryAt: asDate(r.nextRetryAt),
        completedAt: asDate(r.completedAt),
      };
    });
  }

  async saveJob(row: KnowledgeJobRow) {
    await this.db.execute(
      `UPDATE "knowledge_sync_jobs" SET
         "status"=$2, "attempts"=$3, "nextRetryAt"=$4, "lastError"=$5, "completedAt"=$6
       WHERE "id"=$1`,
      [
        row.id,
        row.status,
        row.attempts,
        row.nextRetryAt,
        row.lastError,
        row.completedAt,
      ],
    );
  }

  async listDocumentIds(tenantId: string) {
    const rows = await this.db.query<{ id: string }>(
      `SELECT "id" FROM "knowledge_documents" WHERE "tenantId"=$1`,
      [tenantId],
    );
    return rows.map((r) => r.id);
  }

  async resetProcessingToPending() {
    const before = await this.db.query<{ id: string }>(
      `SELECT "id" FROM "knowledge_sync_jobs" WHERE "status"='PROCESSING'`,
    );
    await this.db.execute(
      `UPDATE "knowledge_sync_jobs" SET "status"='PENDING' WHERE "status"='PROCESSING'`,
    );
    return before.length;
  }
}
