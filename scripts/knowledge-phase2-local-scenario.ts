/**
 * Local-adapter entry. Remote execution is a separate explicit command.
 * See scripts/knowledge-storage-scenario.ts.
 */
import { runLocalRehearsal } from "./knowledge-storage-scenario";

runLocalRehearsal().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
