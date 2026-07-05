import "server-only";

import { pgPool } from "./pg";
import { EMBEDDING_DIM } from "./config";

let schemaReady: Promise<void> | null = null;

/** document_chunks 테이블 / 인덱스를 1회 보장한다. */
export function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      await pgPool.query("CREATE EXTENSION IF NOT EXISTS vector;");
      await pgPool.query(`
        CREATE TABLE IF NOT EXISTS document_chunks (
          id          TEXT PRIMARY KEY,
          source_type TEXT NOT NULL,
          source_id   TEXT NOT NULL,
          chunk_index INT  NOT NULL,
          title       TEXT,
          url         TEXT,
          content     TEXT NOT NULL,
          embedding   vector(${EMBEDDING_DIM}) NOT NULL,
          dealer_id   TEXT,
          min_role    TEXT,
          created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
        );
      `);
      await pgPool.query(
        `ALTER TABLE document_chunks ADD COLUMN IF NOT EXISTS dealer_id TEXT;`,
      );
      await pgPool.query(
        `ALTER TABLE document_chunks ADD COLUMN IF NOT EXISTS min_role TEXT;`,
      );
      await pgPool.query(
        `CREATE INDEX IF NOT EXISTS document_chunks_source_idx
           ON document_chunks (source_type, source_id);`,
      );
      await pgPool.query(
        `CREATE INDEX IF NOT EXISTS document_chunks_embedding_idx
           ON document_chunks USING hnsw (embedding vector_cosine_ops);`,
      );
      await pgPool.query(
        `CREATE INDEX IF NOT EXISTS document_chunks_dealer_id_idx
           ON document_chunks (dealer_id);`,
      );
    })().catch((e) => {
      // 실패 시 다음 호출에서 재시도할 수 있도록 캐시 해제
      schemaReady = null;
      throw e;
    });
  }
  return schemaReady;
}

function toVectorLiteral(vec: number[]): string {
  return `[${vec.join(",")}]`;
}

export interface ChunkInput {
  sourceType: string;
  sourceId: string;
  chunkIndex: number;
  title?: string | null;
  url?: string | null;
  content: string;
  embedding: number[];
  dealerId?: string | null;
  minRole?: string | null;
}

export async function deleteSource(
  sourceType: string,
  sourceId: string,
): Promise<void> {
  await ensureSchema();
  await pgPool.query(
    "DELETE FROM document_chunks WHERE source_type = $1 AND source_id = $2",
    [sourceType, sourceId],
  );
}

export async function upsertChunks(chunks: ChunkInput[]): Promise<void> {
  if (chunks.length === 0) return;
  await ensureSchema();

  const values: string[] = [];
  const params: unknown[] = [];
  let i = 1;
  for (const c of chunks) {
    const id = `${c.sourceType}:${c.sourceId}:${c.chunkIndex}`;
    values.push(
      `($${i++}, $${i++}, $${i++}, $${i++}, $${i++}, $${i++}, $${i++}, $${i++}, $${i++}, $${i++}::vector)`,
    );
    params.push(
      id,
      c.sourceType,
      c.sourceId,
      c.chunkIndex,
      c.title ?? null,
      c.url ?? null,
      c.content,
      c.dealerId ?? null,
      c.minRole ?? null,
      toVectorLiteral(c.embedding),
    );
  }

  await pgPool.query(
    `INSERT INTO document_chunks
       (id, source_type, source_id, chunk_index, title, url, content, dealer_id, min_role, embedding)
     VALUES ${values.join(", ")}
     ON CONFLICT (id) DO UPDATE SET
       title = EXCLUDED.title,
       url = EXCLUDED.url,
       content = EXCLUDED.content,
       dealer_id = EXCLUDED.dealer_id,
       min_role = EXCLUDED.min_role,
       embedding = EXCLUDED.embedding,
       created_at = now();`,
    params,
  );
}

export interface SearchResult {
  id: string;
  sourceType: string;
  sourceId: string;
  title: string | null;
  url: string | null;
  content: string;
  score: number;
  dealerId?: string | null;
  minRole?: string | null;
}

export interface SearchScope {
  role: string;
  dealerId?: string | null;
}

export async function similaritySearch(
  embedding: number[],
  k: number,
  sourceType?: string,
  scope?: SearchScope,
): Promise<SearchResult[]> {
  await ensureSchema();
  const vec = toVectorLiteral(embedding);

  const params: unknown[] = [vec];
  const clauses: string[] = [];

  if (sourceType) {
    params.push(sourceType);
    clauses.push(`source_type = $${params.length}`);
  }

  if (scope && !["ADMIN", "HEADQUARTER"].includes(scope.role)) {
    params.push(scope.dealerId ?? null);
    clauses.push(
      `(dealer_id IS NULL OR dealer_id = $${params.length})`,
    );
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  params.push(k);
  const limitParam = `$${params.length}`;

  const res = await pgPool.query(
    `SELECT id, source_type, source_id, title, url, content, dealer_id, min_role,
            1 - (embedding <=> $1::vector) AS score
       FROM document_chunks
       ${where}
       ORDER BY embedding <=> $1::vector
       LIMIT ${limitParam};`,
    params,
  );

  return res.rows.map((r) => ({
    id: r.id as string,
    sourceType: r.source_type as string,
    sourceId: r.source_id as string,
    title: r.title as string | null,
    url: r.url as string | null,
    content: r.content as string,
    score: Number(r.score),
    dealerId: r.dealer_id as string | null,
    minRole: r.min_role as string | null,
  }));
}

export async function countChunks(): Promise<number> {
  await ensureSchema();
  const res = await pgPool.query("SELECT count(*)::int AS n FROM document_chunks");
  return res.rows[0]?.n ?? 0;
}
