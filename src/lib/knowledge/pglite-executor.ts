import { readFile } from "node:fs/promises";
import path from "node:path";

import { PGlite } from "@electric-sql/pglite";

import type { SqlExecutor } from "./repository";

export function pgliteExecutor(db: PGlite): SqlExecutor {
  const exec = (client: PGlite): SqlExecutor => ({
    async query<T>(sql: string, params: unknown[] = []) {
      const result = await client.query<T>(sql, params);
      return (result.rows ?? []) as T[];
    },
    async execute(sql: string, params: unknown[] = []) {
      const result = await client.query(sql, params);
      return result.affectedRows ?? 0;
    },
    async transaction<T>(fn: (tx: SqlExecutor) => Promise<T>) {
      await client.query("BEGIN");
      try {
        const out = await fn(exec(client));
        await client.query("COMMIT");
        return out;
      } catch (error) {
        await client.query("ROLLBACK").catch(() => undefined);
        throw error;
      }
    },
  });
  return exec(db);
}

export async function applyKnowledgeMigration(db: PGlite) {
  const file = path.join(
    process.cwd(),
    "prisma/migrations/20261002120000_knowledge_v1/migration.sql",
  );
  const sql = await readFile(file, "utf8");
  await db.exec(sql);
}
