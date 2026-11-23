# Adams Platform: Firebase → Azure Migration Plan

**Purpose:** Replace Firebase (Firestore + Firebase Auth + Storage) with Azure-native equivalents so the platform runs entirely inside the Adams Microsoft estate — the "Adams Azure Migration & Ownership" project.

**Current footprint (measured from the codebase):**

| Concern | Today | Count |
|---|---|---|
| Firestore client-SDK call sites (browser code reads/writes DB directly) | `firebase/firestore` imports | **148 files** |
| Admin SDK call sites (server routes) | `adminDb` / `adminAuth` | **66 files** |
| Top-level collections | `lib/schema.ts` COLLECTIONS | **113** |
| Subcollections | project items/files, milestones, actionItems | ~5 paths |
| Auth | Email/password + `verifyIdToken` server checks | `users/{uid}.role` drives `isAdmin()` |
| Security | `firestore.rules` | ~200 lines of per-collection ACLs |
| Storage | worker photos, avatars (some base64 in docs) | Firebase Storage + Firestore docs |

---

## Target Azure stack

| Firebase | Azure equivalent | Notes |
|---|---|---|
| **Firestore** | **Azure Cosmos DB for MongoDB (vCore)** | Document model preserved — collections map 1:1, no normalization (the "throw data over here, connect it later" style Brian chose Firebase for). Native Mongo drivers in Node; change feed covers most `onSnapshot` needs. |
| **Firebase Auth** | **Microsoft Entra ID** (workforce) | Adams' existing tenant — corporate SSO, MFA, conditional access free. Roles become **Entra app roles** emitted as `roles` claims in the token; replaces `users/{uid}.role`. |
| Public/external signups (Academy customers) | **Entra External ID (CIAM)** | Same platform, separate user store for non-employees. |
| **Firestore security rules** | **Server-side authz middleware** | Cosmos has no client-direct ACL layer — every query goes through API routes guarded by Entra token + role checks. The rules file becomes a policy map in code. |
| **Firebase Storage** | **Azure Blob Storage** | Photos/avatars/uploads → blob + short-lived SAS URLs; metadata stays in Cosmos. Also removes the base64-in-doc pattern. |
| `onSnapshot` live updates | Cosmos **change feed** → SignalR (or polling) | Audited usage first — most pages likely only need refetch-on-mutate. |
| Secrets | **Azure Key Vault** | API keys, connection strings, JJ Keller/Jamf secrets — answers Leigh's "where do secrets live" question. |
| Hosting | Existing **Azure Container Apps** (already running) | No change — app already deploys there. |

---

## The architectural pivot (read this first)

**Firestore is accessed directly from the browser in 148 files.** Cosmos DB cannot be — there is no client SDK with per-doc ACLs. Two strategies:

### Strategy A — Firestore façade (recommended, faster)

Build a server-side API (`/api/db/*`) that mimics the small Firestore surface the app actually uses (`getDocs`, `getDoc`, `addDoc`, `updateDoc`, `deleteDoc`, `query+where/orderBy`, `arrayUnion`, `serverTimestamp`), then swap the `firebase/firestore` import for a local shim that POSTs to it. One bridge point, ~148 files keep their query logic untouched.

- **Pros:** weeks not months; bugs stay in one place; easy to dual-run.
- **Cons:** query translation layer must be honest about the subset it supports; compound `where+orderBy` needs index equivalents in Cosmos.

### Strategy B — True API layer (cleaner, slower)

Port each feature's client queries into purpose-built API routes (like the `adams-harness` module already does with `getDb()`/`server-auth`). Right long-term shape, but effectively rewrites every portal page's data path.

**Recommendation: Strategy A now, Strategy B incrementally** for hot paths and anything sensitive (money, safety records) where bespoke API validation belongs anyway.

---

## MCP integration — the AI automation layer

The migration is the right moment to standardize how AI agents (Hermes, GBrain, Copilot Studio, future assistants) reach platform data. Today every integration is bespoke: Hermes calls internal APIs ad hoc, the Telegram bridge has its own auth path, and the transcript projects (Morning Brief → Task Distillation, Teams data access, Graph email/calendar) each need the same plumbing built separately. **Model Context Protocol (MCP)** replaces that with one tool contract:

### Target shape

| MCP component | Purpose | Hosting |
|---|---|---|
| **Adams Platform MCP server** | Exposes the façade + admin actions as typed tools: `query_collection`, `create_project`, `update_item_status`, `cert_lookup`, `safety_request_inbox`, `lms_publish` — each gated by the Phase 4 policy map | Container Apps (new `mcp` container beside `web`/`hermes`), streamable-HTTP transport, Entra token passthrough |
| **Microsoft Graph MCP server** | Mail, calendar, Teams messages, OneDrive/SharePoint — covers the "Microsoft Graph: Email & Calendar" and "Chat Access: Teams" projects without hand-rolled Graph calls per feature | First-party Microsoft MCP endpoint where available; otherwise a thin adapter in the same `mcp` container |
| **Cosmos/data tools** | Read-only aggregation tools (`cert_expiry_report`, `project_status_rollup`) backed by Cosmos with row-level scoping — NOT raw query access | Same `mcp` container; connects via the façade store, never the raw connection string |
| **Hermes as MCP client** | Hermes/GBrain discovers tools over MCP instead of bespoke fetch calls; the existing Telegram/Teams chat surfaces get tools automatically | Existing `hermes` container; add `MCP_SERVERS` env config |
| **Devin / IDE clients** | `mcp_config.json` (already in repo) gets the Adams MCP server so coding agents can query the live platform (read-scoped) for context | Local |

### Security model (this is the point)

- **Tool-level authz, not ambient data access.** Every MCP tool call carries the caller's Entra JWT; the server re-runs the Phase 4 policy map per request. An agent acting for a field employee literally cannot reach safety records or payroll data — answering Leigh's "real permissions vs UI-hidden permissions" concern at the protocol layer.
- **Secrets never enter agent context.** MCP servers read Key Vault at runtime; tool responses return data, not credentials.
- **Audit trail.** Tool calls write to `adamsAuditLogs` (actor, tool, args hash, result size) — the same ledger Telegram writes already use.
- **Scoped exposure by design.** Public/field-facing surfaces (Telegram, SMS bridge) mount only a read-only + previewed-write toolset; internal Hermes gets the full set. Adding a new surface = config, not code.

### Why now

- The façade (`/api/db/*`) already centralizes authz — the MCP server wraps the *same* store layer, so agent access can never bypass what the app enforces.
- One MCP server replaces four pending custom integrations (Graph, Teams chat, morning-brief ingestion, task distillation actions).
- When Copilot Studio or another vendor MCP client shows up, it's a client registration — zero new platform code.

---

## Phases

### Phase 0 — Inventory & decisions *(~1 week)*

1. Export collection census: doc counts, sizes, field shapes per collection (script over Admin SDK).
2. Audit `onSnapshot`/listener usage → classify "needs realtime" vs "fetch-once".
3. Audit auth surface: sign-in/sign-up/reset flows, masquerade feature, Telegram/Teams identity binding (`firebaseUid` on teamMembers), service-account usage.
4. **Decision gates:**
   - Cosmos for MongoDB vCore (recommended) vs Cosmos NoSQL vs Postgres+JSONB
   - Entra workforce-only vs workforce + External ID for Academy public users
   - Façade (A) vs refactor (B) per module
5. Size Cosmos: estimate RU/vCore tier from doc counts + request patterns.

### Phase 1 — Auth migration *(~2 weeks)*

1. Entra app registration (`Adams Platform`) with app roles: `superadmin`, `admin`, `team`, `affiliate`, `consultant`, `client`, `safety` — mirrors `users/{uid}.role` + leadership flags.
2. Add **NextAuth/MSAL** alongside Firebase: sign-in page offers "Sign in with Microsoft"; server-auth accepts **either** Entra JWT or Firebase ID token during transition (`verifyIdToken` → `jwtVerify` on Entra JWKS).
3. Link identities: `teamMembers.firebaseUid` → add `entraOid`; masquerade feature re-implemented as admin-issued claims.
4. **User migration:** Firebase passwords can't be exported → invite-based activation (email link → set password / SSO) for ~20 internal users; public Academy users get External ID self-service signup. Firebase accounts stay readable until every uid is mapped.
5. Update `server-auth.ts` + `lib/firebase.ts` auth context to Entra session; role checks read token `roles` claim instead of a Firestore `get()` per request (also fixes the per-request role read in today's rules).

### Phase 2 — Data layer *(~3–4 weeks)*

1. Provision Cosmos vCore + databases; create collections matching the 113 Firestore collections + subcollection paths (`projects_items`, or nested docs for small subcollections like milestones).
2. Build the façade: `lib/cosmos/firestore-shim.ts` exposing `collection/query/where/orderBy/limit/getDocs/addDoc/updateDoc/deleteDoc/doc/Timestamp/serverTimestamp/arrayUnion/arrayRemove/increment` → translates to Mongo queries server-side via `/api/db/query` + `/api/db/mutate` (batched writes in one call to keep round-trips sane).
3. Authz middleware enforces the ported rules (Phase 5 table) on every request — no client trust.
4. Port the 66 Admin-SDK files: `adminDb` → `cosmosDb()` with the same collection names; `adminAuth.verifyIdToken` → Entra validation. Most are 1:1 swaps since they already go through `getDb()`/`lib/firebase-admin`.
5. Timestamps: Firestore `Timestamp` → BSON `Date` with a serializer seam (the app's `instanceof Timestamp` checks need a `toDate()`-shaped class or an `IsoDate` wrapper).

### Phase 3 — Migrate data *(~1 week + sync window)*

1. `scripts/migrate/export-firestore.mts` — stream every collection + subcollection to NDJSON (one file per collection) via Admin SDK.
2. `scripts/migrate/import-cosmos.mts` — transform + bulk insert: Timestamp→Date, documentId→`_id`, subcollection paths → target collections, strip Firebase-only fields; idempotent by `_id` so it's re-runnable.
3. Validate: per-collection counts + checksum sample; spot-check LMS courses, projects, teamMembers, users.
4. Blob Storage: upload base64 file docs + Storage files; rewrite `dataBase64`/`photoPath` fields to blob URLs (keep base64 fallback during transition).
5. **Delta sync** for cutover day: re-run export filtering `updatedAt > lastRun` (or short dual-write window if gaps are unacceptable).

### Phase 4 — Security rules parity *(~2 weeks, overlaps Phase 2)*

Port every `match` block in `firestore.rules` to the middleware policy map:

- `users` → self-or-admin read, self-update without role escalation (port the "can't change own role" invariant explicitly)
- `teamMembers` → read authed, write admin (existing Adams rules already here)
- `projects`/`items`/`files`, `meetings`, `actionItems`, `rocks` → authed read/write, admin delete
- LMS collections → draft-vs-published visibility, answer-key server-side rule
- Safety/worker records → Safety-dept-scoped reads (emergency contacts already restricted today)
- Test: replay the **25/25 security test suite** pattern against the middleware — same matrix, new enforcement point.

### Phase 5 — Cutover & decommission *(~1 week)*

1. Feature flag `DATA_BACKEND=firebase|cosmos` per module; run Cosmos in shadow-read mode first (compare results, log diffs).
2. Freeze writes → final delta export → point `DATA_BACKEND=cosmos` → smoke test sign-in, projects views, LMS grading, Telegram webhook, admin pages.
3. Parallel-run 2 weeks; keep Firebase project readable for rollback.
4. Decommission: revoke Firebase keys, delete secrets, archive a final Firestore export to Blob; remove `firebase`/`firebase-admin` deps and the façade's Firebase branch.

### Phase 6 — MCP integration *(~2 weeks, runs parallel after Phase 2)*

1. Scaffold the `mcp` container in Container Apps: streamable-HTTP MCP server, Entra JWT validation, health probe — same deploy pipeline as `web`/`hermes`.
2. Tool v1 set: `query_collection` + `doc_get` (read tools over `lib/cosmos/store.ts`), `create_project` / `update_item_status` / `safety_request_submit` (previewed-write tools with confirm-before-commit), `cert_expiry_report` (aggregate).
3. Wire Hermes as MCP client (`MCP_SERVERS` env); migrate one existing bespoke integration (Telegram safety-request intake) onto tools as the proof case.
4. Register Microsoft Graph MCP — mail read/calendar write scopes; admin consent lands with the Phase 1 Entra work.
5. Tool-call audit logging → `adamsAuditLogs`; per-surface toolset allowlists (Telegram read-only, Hermes internal full).
6. Acceptance: an agent session can query projects, draft a project update, and get a denied-tool response when reaching for `platformSettings` — all logged.

---

## Risks & call-outs

| Risk | Mitigation |
|---|---|
| **148 client-direct call sites** is the real cost — not the DB itself | Façade strategy; per-module shadow verification before cutover |
| Passwords can't leave Firebase | Invite/reset flow; SSO makes this a non-issue for employees |
| `getUserRole()` per-request doc read becomes a JWT claim | Faster, but role changes need token refresh — set short token lifetime + reissue on role update |
| `onSnapshot` realtime pages | Audit in Phase 0; most portal pages are fetch-once anyway |
| Compound query indexes differ in Cosmos | Log façade query plans during shadow-run; create indexes per collection |
| MCP agents widen the data-access blast radius | Tools wrap the same policy map as `/api/db/*`; per-surface allowlists; audit every call; read-only + previewed-write defaults |
| Microsoft Graph MCP availability/consent varies | Thin adapter fallback in the `mcp` container; consent bundled with Phase 1 app registration |
| Team size (Brian + Jake) | Sequence phases; Phase 0 decisions before any build work |
| Leigh's security questions | Delivered by this design: secrets → Key Vault, permissions → server middleware (not UI hiding), data → Adams tenant |

## Estimated effort

~8–10 weeks calendar for the full migration at current capacity — Phase 0 and Phase 1 start first since Entra auth unblocks everything else; Phase 6 (MCP) slots in alongside Phases 3–5 once the façade exists. The project is already tracked as **"Adams Azure Migration & Ownership"** in Projects.
