/**
 * Local-adapter entry. Remote execution is a separate explicit command.
 * See scripts/knowledge-storage-scenario.ts.
 */
import { runLocalRehearsal } from "./knowledge-storage-scenario";
import { safeErrorName } from "../src/lib/knowledge/storage-error";

runLocalRehearsal()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error: unknown) => {
    process.stderr.write(`${safeErrorName(error)}\n`);
    process.exitCode = 1;
  });
