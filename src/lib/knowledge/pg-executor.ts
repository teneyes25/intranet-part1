import type { Pool } from "pg";

import type { SqlExecutor } from "./repository";

/** Independent-connection executor for a local development Postgres only. */
export function pgPoolExecutor(pool: Pool): SqlExecutor {
  return {
    async query<T>(sql: string, params: unknown[] = []) {
      const result = await pool.query(sql, params);
      return result.rows as T[];
    },
    async execute(sql: string, params: unknown[] = []) {
      const result = await pool.query(sql, params);
      return result.rowCount ?? 0;
    },
    async transaction<T>(fn: (tx: SqlExecutor) => Promise<T>) {
      const client = await pool.connect();
      const tx: SqlExecutor = {
        async query<R>(sql: string, params: unknown[] = []) {
          const result = await client.query(sql, params);
          return result.rows as R[];
        },
        async execute(sql: string, params: unknown[] = []) {
          const result = await client.query(sql, params);
          return result.rowCount ?? 0;
        },
        transaction(inner) {
          return inner(tx);
        },
      };
      try {
        await client.query("BEGIN");
        const out = await fn(tx);
        await client.query("COMMIT");
        return out;
      } catch (error) {
        await client.query("ROLLBACK").catch(() => undefined);
        throw error;
      } finally {
        client.release();
      }
    },
  };
}
