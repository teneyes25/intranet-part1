/** Feature flag default OFF. Existing intranet work is unchanged unless enabled. */
export function isKnowledgeV1Enabled() {
  return process.env.KNOWLEDGE_V1_ENABLED === "true";
}

export function knowledgeTenantId() {
  return process.env.KNOWLEDGE_TENANT_ID || "french-maison";
}

export function knowledgeAclTtlMs() {
  const raw = Number(process.env.KNOWLEDGE_ACL_TTL_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : 300_000;
}
