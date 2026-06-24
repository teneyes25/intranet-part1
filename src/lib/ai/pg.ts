import "server-only";

import { Pool } from "pg";

const globalForPg = globalThis as unknown as { aiPgPool?: Pool };

/**
 * pgvector 접근용 전용 커넥션 풀. Prisma 와 별개로 raw SQL(벡터 연산)에 사용한다.
 */
export const pgPool =
  globalForPg.aiPgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPg.aiPgPool = pgPool;
}
