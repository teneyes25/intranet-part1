import "server-only";

import { createKnowledgeStorage } from "./storage-create";

/** Server entry. The default driver is local. Credentials are not read here. */
export function createServerKnowledgeStorage() {
  return createKnowledgeStorage(process.env);
}
