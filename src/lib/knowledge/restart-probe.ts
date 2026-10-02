import { PGlite } from "@electric-sql/pglite";

import { pgliteExecutor } from "./pglite-executor";
import { SqlKnowledgeRepository } from "./repository";

function requiredArg(index: number): string {
  const value = process.argv[index];
  if (!value) {
    console.error("usage: restart-probe <dataDir> <tenantId>");
    process.exit(2);
  }
  return value;
}

const dataDir = requiredArg(2);
const tenantId = requiredArg(3);

async function main() {
  const db = new PGlite(dataDir);
  const repo = new SqlKnowledgeRepository(pgliteExecutor(db));
  const reclaimed = await repo.reclaimExpiredJobs(tenantId, new Date());
  const jobs = await repo.listJobs();
  console.log(
    `RESULT ${JSON.stringify({
      reclaimed,
      jobs: jobs.map((job) => ({
        tenantId: job.tenantId,
        documentId: job.documentId,
        status: job.status,
      })),
    })}`,
  );
  await db.close();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
