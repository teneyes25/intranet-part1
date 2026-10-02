import { createHash, randomUUID } from 'node:crypto';

// Executable contract prototype. Trusted contexts must be produced by server auth,
// never from request bodies. Memory adapters are NOT production persistence.
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const copy = value => structuredClone(value);
const requireValue = (condition, message) => { if (!condition) throw new Error(message); };
export class KnowledgePrototype {
  #docs = new Map();
  #objects = new Map();
  #events = new Map();
  constructor({ now = () => Date.now(), aclTtlMs = 300_000 } = {}) {
    this.now = now; this.aclTtlMs = aclTtlMs;
  }
  #key(tenant, id) { return JSON.stringify([tenant, id]); }
  #service(ctx) {
    requireValue(ctx?.tenantId && ctx.kind === 'sync-service', 'unauthorized');
  }
  #doc(ctx, id) {
    const doc = this.#docs.get(this.#key(ctx.tenantId, id));
    requireValue(doc, 'not found'); return doc;
  }
  upload(ctx, { documentId, title, bytes, expectedHash, mimeType }) {
    this.#service(ctx);
    requireValue(typeof documentId === 'string' && documentId.length > 0, 'document ID required');
    requireValue(Buffer.isBuffer(bytes), 'bytes required');
    requireValue(sha256(bytes) === expectedHash, 'hash mismatch');
    const key = this.#key(ctx.tenantId, documentId);
    let doc = this.#docs.get(key);
    if (!doc) {
      doc = { id: documentId, title, tenantId: ctx.tenantId, versions: {}, sequence: 0,
        approvedVersion: null, activeVersion: null, allowedGroups: [], aclAt: null, revoked: false };
      this.#docs.set(key, doc);
    }
    const versionId = randomUUID();
    this.#objects.set(versionId, Buffer.from(bytes));
    doc.versions[versionId] = { versionId, hash: expectedHash, mimeType, status: 'STORED', chunks: [] };
    return { documentId, versionId, hash: expectedHash, status: 'STORED' };
  }
  applyEvent(ctx, event) {
    this.#service(ctx);
    const { eventId, documentId, sequence, type, versionId, allowedGroups } = event;
    requireValue(typeof eventId === 'string' && eventId.length > 0, 'event ID required');
    const eventKey = this.#key(ctx.tenantId, eventId);
    // Exact retries only; reject reuse of an event ID with different data.
    const fingerprint = JSON.stringify([documentId, sequence, type, versionId, allowedGroups]);
    if (this.#events.has(eventKey)) {
      requireValue(this.#events.get(eventKey) === fingerprint, 'event ID conflict');
      return { duplicate: true };
    }
    const doc = this.#doc(ctx, documentId);
    requireValue(Number.isSafeInteger(sequence) && sequence === doc.sequence + 1, 'sequence gap or stale event');
    requireValue(['APPROVE', 'ACL', 'REVOKE'].includes(type), 'invalid event type');
    if (type === 'APPROVE') {
      requireValue(doc.versions[versionId], 'version not stored');
      requireValue(Array.isArray(allowedGroups) && allowedGroups.every(g => typeof g === 'string'), 'ACL required');
      doc.approvedVersion = versionId; doc.allowedGroups = [...allowedGroups];
      doc.aclAt = this.now(); doc.revoked = false;
    } else if (type === 'ACL') {
      requireValue(Array.isArray(allowedGroups) && allowedGroups.every(g => typeof g === 'string'), 'ACL required');
      doc.allowedGroups = [...allowedGroups]; doc.aclAt = this.now();
    } else {
      doc.revoked = true; doc.activeVersion = null; doc.approvedVersion = null;
    }
    doc.sequence = sequence; this.#events.set(eventKey, fingerprint);
    return { duplicate: false, sequence };
  }
  indexApprovedText(ctx, { documentId, versionId, extractor = bytes => bytes.toString('utf8') }) {
    this.#service(ctx);
    const doc = this.#doc(ctx, documentId);
    requireValue(!doc.revoked && doc.approvedVersion === versionId, 'not approved version');
    const version = doc.versions[versionId];
    requireValue(['text/plain', 'text/markdown'].includes(version.mimeType), 'unsupported format');
    try {
      const text = extractor(Buffer.from(this.#objects.get(versionId)));
      requireValue(typeof text === 'string' && text.trim().length > 0, 'empty extraction');
      const chunks = text.split(/\n\s*\n/).filter(s => s.trim()).map((content, i) => ({
        chunkId: `${versionId}:${i}`, content, locator: { paragraph: i + 1 },
      }));
      // Recheck before publishing; old extraction work must never restore revoked content.
      requireValue(!doc.revoked && doc.approvedVersion === versionId, 'approval changed');
      version.chunks = chunks; version.status = 'READY'; version.indexedAt = this.now();
      doc.activeVersion = versionId;
    } catch (error) { version.status = 'FAILED'; throw error; }
  }
  #authorized(ctx, doc) {
    return ctx?.kind === 'user' && ctx.active === true && ctx.tenantId === doc.tenantId
      && !doc.revoked && doc.activeVersion && doc.aclAt !== null
      && this.now() - doc.aclAt < this.aclTtlMs
      && Array.isArray(ctx.groups) && ctx.groups.some(g => doc.allowedGroups.includes(g));
  }
  search(ctx, query) {
    requireValue(ctx?.kind === 'user' && ctx.active === true, 'unauthorized');
    requireValue(typeof query === 'string' && query.trim().length > 0, 'query required');
    const hits = [];
    for (const doc of this.#docs.values()) {
      if (!this.#authorized(ctx, doc)) continue;
      const version = doc.versions[doc.activeVersion];
      for (const chunk of version.chunks) {
        if (chunk.content.toLowerCase().includes(query.trim().toLowerCase())) {
          hits.push({ documentId: doc.id, title: doc.title, versionId: version.versionId,
            hash: version.hash, ...copy(chunk), indexedAt: version.indexedAt, aclAt: doc.aclAt });
        }
      }
    }
    return hits;
  }
  download(ctx, documentId, versionId) {
    const doc = this.#doc(ctx, documentId);
    requireValue(this.#authorized(ctx, doc) && versionId === doc.activeVersion, 'forbidden');
    return Buffer.from(this.#objects.get(versionId));
  }
}
