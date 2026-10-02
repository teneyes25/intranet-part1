# Knowledge v1 contract prototype

This isolated executable prototype implements the first approved architecture slice:
original bytes → version approval → text indexing → permission-filtered retrieval.
It does not change existing intranet routes, schema, uploads or deployment.

Run with Node.js 22+:

```sh
node --test prototypes/knowledge-v1/core.test.mjs
```

Verified: 9 tests pass on Node.js 24.19.0. Tests cover hash preservation, draft
exclusion, tenant/group boundaries, inactive users, service/user separation,
idempotent events, sequence gaps, failed replacement retaining the active version,
revocation, ACL expiry, unsupported formats and stale indexing work.

## Explicit limitations

- In-memory state: restarting loses all data. No durable outbox, retry queue,
  transactions, HTTP server, OAuth/OIDC, cloud adapter or production deployment.
- Context objects represent an already-authenticated server principal. Never
  deserialize a request body into these contexts or expose this class as an API.
- Search is literal substring matching, not semantic/vector retrieval.
- Only UTF-8 plain text and Markdown are supported. No PDF/PPTX/XLSX/OCR parser.
- Indexing is synchronous. Production workers must atomically compare approval
  revision, ACL revision and document version before activating an index generation.
- Events are strictly sequential. Gaps fail for the durable worker to retry/reconcile.
- Every document fails closed after five minutes without an ACL refresh. This is
  a contract demonstration, not a measured availability SLA.
- No public network listener, real staff data or credentials are involved.
- Whole-application build/e2e checks have not run; the repository was inspected by
  API at the pinned commit, and this local folder contains only additive changes.

Production adapters must preserve these contracts. Expand tests for worker restart,
concurrent approval/revocation, durable retries, download authorization and tenant
isolation before wiring the existing UI or any external agent.
