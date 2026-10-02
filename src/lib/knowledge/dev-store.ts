import path from "node:path";

import { prisma } from "@/lib/prisma";

import { knowledgeAclTtlMs } from "./flags";
import { SqlKnowledgeRepository, type SqlExecutor } from "./repository";
import { KnowledgeService } from "./service";
import { LocalFsStorageAdapter } from "./storage";

function prismaExecutor(): SqlExecutor {
  return {
    async query<T>(sql: string, params: unknown[] = []) {
      const rows = await prisma.$queryRawUnsafe<T[]>(sql, ...params);
      return rows;
    },
    async execute(sql: string, params: unknown[] = []) {
      return prisma.$executeRawUnsafe(sql, ...params);
    },
    async transaction<T>(fn: (tx: SqlExecutor) => Promise<T>) {
      return prisma.$transaction(async (tx) => {
        const inner: SqlExecutor = {
          async query<R>(sql: string, params: unknown[] = []) {
            return tx.$queryRawUnsafe<R[]>(sql, ...params);
          },
          async execute(sql: string, params: unknown[] = []) {
            return tx.$executeRawUnsafe(sql, ...params);
          },
          transaction(child) {
            return child(inner);
          },
        };
        return fn(inner);
      });
    },
  };
}

/** App-process service using intranet Prisma + local originals directory. */
export function createAppKnowledgeService() {
  const repo = new SqlKnowledgeRepository(prismaExecutor());
  const storage = new LocalFsStorageAdapter(
    path.join(process.cwd(), "uploads", "knowledge"),
  );
  return new KnowledgeService(repo, storage, { aclTtlMs: knowledgeAclTtlMs() });
}
