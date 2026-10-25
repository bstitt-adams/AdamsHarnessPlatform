# Product Requirements Document: Reusable Requirements Interview Tool

## 1. Document Control

| Field | Value |
| --- | --- |
| Product | Requirements Interview Tool |
| Current implementation name | Adams Harness / Interview Ideas to Solutions |
| Document purpose | Define a portable product that can be reused on other websites and internal platforms |
| Status | Draft for implementation planning |
| Primary platform | Next.js 16, React 19, TypeScript, Firestore, OpenAI-compatible AI endpoint |
| Current production site | Adams Platform |

## 2. Executive Summary

The Requirements Interview Tool is an AI-guided discovery system that captures the respondent's identity and process ownership area, then converts their description of a manual business process into a structured, versioned software specification. It supports both authenticated portal users and unauthenticated public visitors.

The tool should be packaged as a reusable product capability that can be deployed on other websites with configurable branding, departments, authentication, AI provider, storage backend, and post-interview workflow actions.

### Current outcome

A completed interview produces:

- A searchable interview transcript
- Respondent name and selected department/category
- Structured process facts
- Coverage of 15 discovery topics
- Attachment analyses and generated follow-up questions
- A versioned solution specification
- Approval workflow and canonical specification hash
- An optional platform-aware requirements document that classifies the request as a new app or an enhancement
- Recommended data-sharing and integration opportunities across existing apps
- Staging and deployment hooks for a standardized solution app workspace

### Reusable outcome

On another site, the same engine should support configurable discovery topics and outputs such as:

- Software requirements discovery
- Business process intake
- Client onboarding questionnaires
- Security or compliance assessments
- Operations workflow documentation
- Product discovery and solution scoping
- AI-assisted requirements gathering for agencies or consultants

## 3. Goals

### Business goals

1. Reduce the effort required to collect complete software/process requirements.
2. Standardize how departments or clients describe workflows, systems, pain points, approvals, and integrations.
3. Convert interview responses into usable specifications without requiring a business analyst for every first pass.
4. Enable reuse across customer-facing, partner-facing, and internal sites.
5. Provide a deterministic, auditable record suitable for approvals and downstream implementation.
6. Identify whether a request should create a new app or enhance an existing app before implementation starts.
7. Recommend cross-app data sharing so platform capabilities compound instead of creating isolated silos.

### Product goals

1. Support anonymous/public and authenticated interview modes.
2. Ask one focused question per turn.
3. Support seeded interviews, templates, and free-form processes.
4. Accept spreadsheets and documents as interview evidence.
5. Extract structured facts and track coverage automatically.
6. Generate a versioned specification only when readiness criteria are met.
7. Provide a deterministic fallback when the configured AI provider is unavailable.
8. Analyze completed interviews against the live app/module catalog before staging implementation.
9. Allow authorized admins to edit AI-generated requirements and regenerate them with added context.
10. Stage accepted requirements and deploy only through an explicit authorized action.
11. Allow another deployment to customize branding, domain language, coverage topics, output format, and destination integrations.

### Portability goals

1. Separate the interview engine from Adams Electric branding.
2. Replace hard-coded domain prompts with tenant/interview-template configuration.
3. Abstract database, authentication, AI provider, rate limiter, file parsing, audit, and notification dependencies.
4. Ship embeddable UI components plus API routes/server actions.
5. Allow each site to choose whether approved specifications create tasks, tickets, documents, proposals, module builds, or external webhooks.

## 4. Non-Goals

The reusable interview tool does not inherently provide:

- Full project management
- Source code generation
- A no-code application builder
- General-purpose chatbot behavior outside the interview context
- Legal, HR, medical, or safety advice
- Automatic approval of specifications without human review
- Storage of uploaded file binaries by default; the current implementation stores extracted analysis metadata, not the original file

Downstream module/workflow generation may be an optional adapter, not a required part of the reusable core.

## 5. Users and Personas

### Public requester

A site visitor who wants to describe a process or request a solution without creating an account.

Needs:

- Required full-name capture
- Simple department/category picker
- No sign-in requirement
- Secure continuation of only their interview
- File upload support
- Clear completion state

### Authenticated requester

An internal user who owns or participates in a process.

Needs:

- Start a seeded or custom interview
- Upload supporting artifacts
- Resume and revise the interview
- Generate a specification when ready
- Track status in a dashboard

### Department/category owner

A leader accountable for the process area.

Needs:

- Review interviews and specifications
- Request changes
- Approve specifications
- Trigger downstream implementation or handoff

### Administrator

A platform operator configuring the reusable product.

Needs:

- Manage categories/departments
- Configure branding and prompts
- Configure AI provider and model
- Manage permissions and rate limits
- Review audit logs and health
- Export or delete data when required

### Implementation team

Developers, consultants, analysts, or automation agents consuming the final specification.

Needs:

- Versioned machine-readable specification
- Canonical hash
- Traceability to interview facts and transcript
- Export/webhook/API access

## 6. Current Implementation Summary

### Public flow

Route: `/interview`

- Fetches active departments from `GET /api/public/interview`.
- Asks for the respondent's full name before showing department choices.
- Displays department choices as a numbered list.
- Starts an anonymous interview with `POST /api/public/interview`, including `departmentId` and `respondentName`.
- Stores a random `publicSessionToken` in an HTTP-only cookie scoped to the interview API path.
- Continues the conversation through `POST /api/public/interview/[id]/messages`.
- Uploads attachments through `POST /api/public/interview/[id]/attachments`.
- Public responses omit the session token.

Primary component:

- `components/marketing/public-interview.tsx`

### Authenticated portal flow

Routes:

- `/portal/solutions`
- `/portal/solutions/new`
- `/portal/solutions/[id]`

Capabilities:

- Department selection and confirmation
- Explicit respondent-name capture, prefilled from the signed-in profile when available
- Starter templates
- Title and process seed
- Optional initial attachment
- Chat transcript
- Coverage progress
- Attachment analysis
- Specification generation
- Specification approval
- Optional downstream build/workspace launch

### Admin PRD flow

Route: `/portal/admin/interviews`

Capabilities:

- Collect and organize all submitted interviews.
- Search by title, respondent, department, PRD, and target app.
- Filter interviews by PRD status.
- Generate an AI requirements document from the interview and live module catalog.
- Classify the request as a new app, an existing-app enhancement, or needs review.
- Identify the likely target app for enhancement requests.
- Recommend existing apps that should read, write, or exchange data with the requested capability.
- Edit generated PRD Markdown before acceptance.
- Store admin notes and regeneration instructions as additional AI context.
- Regenerate the PRD as a new version while superseding prior versions.
- Stage accepted PRDs before deployment.
- Deploy a staged PRD through the existing approved-specification/module-build path.

### AI flow

The server sends the interview transcript, current coverage state, extracted facts, unresolved questions, and attachment summaries to an OpenAI-compatible Hermes endpoint.

The expected structured response includes:

- `assistantMessage`
- `facts`
- `coverage`
- `unresolvedQuestions`
- `readyForSpecification`

If Hermes is unavailable or unconfigured, the current implementation can use a deterministic guided fallback that walks through the required topics.

### Specification flow

When all required coverage topics are complete and no unresolved questions remain:

1. The user generates a specification.
2. The system compiles structured sections from facts, transcript, and attachments.
3. A SHA-256 canonical hash is computed.
4. A new version is stored.
5. Prior non-approved versions may be superseded.
6. A department owner/admin can approve, request changes, or trigger a downstream build.

## 7. Functional Requirements

### FR-1: Interview templates

The system must support configurable interview templates.

Each template defines:

- Template ID and slug
- Name and description
- Active status
- Intended audience: public, authenticated, or both
- Branding/theme overrides
- Category/department picker configuration
- Seed prompt/task text
- Required coverage topics
- Fact schema
- Assistant system prompt
- Completion criteria
- Output/specification schema
- Post-completion actions

Default template: software/process requirements interview.

### FR-2: Respondent identity and category selection

The tool must support a configurable intake step where the respondent identifies themselves and selects a process owner/category.

Requirements:

- Require the respondent's full name before the interview starts.
- Public mode must ask for name first and department/category second.
- Authenticated mode should prefill the respondent name from the signed-in profile while allowing correction.
- Store the respondent name as immutable interview metadata separate from the authenticated actor ID.
- List only active categories.
- Public API returns only safe display fields.
- Authenticated API can restrict visible categories by membership/ownership.
- Support manual categories when no directory exists.
- Respondent identity and category IDs must be tenant-scoped.

### FR-3: Start interview

Authenticated mode must accept:

- Respondent name
- Category/department ID
- Title
- Optional task/process seed
- Optional starter template
- Optional initial attachment

Public mode must accept:

- Respondent name
- Category/department ID
- Optional template/session context

The system creates an interview in `interviewing` or `draft` state and initiates the first assistant turn.

### FR-4: Conversational interview

The assistant must:

- Ask one focused question per turn.
- Use the transcript, facts, coverage, unresolved questions, attachments, and template prompt.
- Merge newly extracted facts without duplicating list values.
- Mark topics covered only after adequate answers.
- Track unresolved questions.
- Set `readyForSpecification` only when completion criteria are satisfied.
- Preserve the full message history.

### FR-5: Coverage tracking

The current implementation requires 15 topics:

1. Department/category
2. Task/process
3. Trigger and frequency
4. Current steps
5. Actors
6. Systems
7. Pain points
8. Desired process
9. Notifications
10. Completion evidence
11. Timing and escalation
12. Exceptions
13. Compliance
14. Integrations
15. Human approvals

The reusable version must treat this list as template configuration rather than a universal constant.

### FR-6: Attachment upload and analysis

Supported formats in the current implementation:

- Excel: `.xlsx`, `.xls`, `.csv`
- PowerPoint: `.pptx`, `.ppt`
- Word: `.docx`, `.doc`
- PDF: `.pdf`
- Markdown: `.md`
- Text: `.txt`

Requirements:

- Enforce a configurable maximum file size; current default is 15 MB.
- Detect file type by extension and MIME type.
- Extract structured text and summaries.
- For spreadsheets, extract sheet names, columns, formulas, row counts, and sample rows.
- Generate contextual follow-up questions.
- Add attachment-derived facts to interview state.
- Keep attachment metadata and extracted analysis on the interview document.
- Never return raw secrets or session credentials.

Portable requirement: file parsers must be pluggable so another deployment can enable only the formats it supports.

### FR-7: Public continuation security

For anonymous interviews:

- Generate a cryptographically random session token.
- Store only the server-side token value on the interview.
- Set an HTTP-only, `sameSite=lax` cookie scoped narrowly to the interview API path.
- Require the cookie for message and attachment continuation.
- Never expose the token in API response bodies.
- Prevent access to non-public interviews through public endpoints.

### FR-8: Authenticated access control

Interview access must allow:

- Interview creator
- Category/department owner
- Authorized department member, where appropriate
- Admin/superadmin

Write permissions must distinguish:

- Owner/creator revision rights
- Department owner review rights
- Admin override rights

### FR-9: Status lifecycle

Interview statuses:

- `draft`
- `interviewing`
- `ready_for_review`
- `completed`

Specification statuses:

- `draft`
- `user_review`
- `approved`
- `changes_requested`
- `superseded`

The reusable system should allow a deployment to map these states to its own labels while preserving machine-readable states.

### FR-10: Specification generation

A specification can be generated only when readiness criteria are met.

Generated sections must include, at minimum:

- Summary
- Current process
- Future process
- Pain points
- Roles and responsibilities
- Data entities
- Forms
- Notifications
- Integrations
- Approval steps
- Permissions
- Audit requirements
- Acceptance criteria
- Risks
- Out of scope

The reusable version must support custom output schemas per template.

### FR-11: Specification versioning and integrity

Each generated specification must:

- Increment its version.
- Store source interview ID and category/department ID.
- Store creator metadata.
- Store model/provider information.
- Compute a deterministic canonical hash.
- Supersede eligible prior versions.
- Prevent mutation of an approved latest version without an explicit revision flow.

### FR-12: Approval workflow

Authorized reviewers must be able to:

- Submit for review
- Request changes
- Approve
- Capture approver identity, role, timestamp, note, and canonical hash
- Trigger configured post-approval actions

### FR-13: Admin PRD analysis and application classification

An authorized admin must be able to generate a platform-aware requirements document for a submitted interview.

The generated PRD must:

- Use the interview transcript, extracted facts, attachments, department, respondent, and any generated specification as source material.
- Query the deployment's live app/module catalog rather than assuming every request is new.
- Classify the request as:
  - `new_app`
  - `existing_app_enhancement`
  - `uncertain`
- Identify a target app/module for enhancement requests, including slug, name, reason, and confidence.
- Recommend data-sharing opportunities with existing apps, including direction, shared entities, recommendation, and benefit.
- Recommend reusable integrations and platform capabilities.
- Include an executive summary and editable PRD Markdown.
- Include functional requirements, data model, permissions/security, integrations, analytics, rollout plan, acceptance criteria, assumptions, and open questions.
- Fall back to deterministic heuristics when the AI provider is unavailable.

### FR-14: PRD editing and contextual regeneration

Authorized admins must be able to:

- Edit generated PRD content without losing the AI-generated structure.
- Save admin notes/corrections.
- Enter regeneration instructions.
- Regenerate the PRD with the previous PRD, manual edits, admin notes, interview content, and live app catalog as context.
- Increment the PRD version and supersede prior non-deployed versions.
- Preserve immutable version history and canonical hashes.

### FR-15: PRD staging and deployment

The system must provide a staging queue between requirement acceptance and production deployment.

Requirements:

- Accepted PRDs move to `staged` status through explicit admin action.
- Manual PRD or context edits must be regenerated into the deployable specification before staging or deployment.
- Only staged PRDs can be deployed.
- Deployment must be authorized server-side by an admin/superadmin role.
- Deployment must create or update the downstream specification/module-build artifact through the configured build adapter.
- The PRD must retain build ID, module slug, deployment timestamp, and production URL when available.
- Deployment failures must be visible and auditable without silently changing the PRD state.
- A deployed PRD is immutable; later changes must create a new PRD version.

### FR-16: Dashboard and search

An authenticated dashboard must provide:

- Interview list
- Respondent display
- Status filter
- Department/category filter
- Global search including respondent name
- Coverage/readiness indicators
- Counts by status and category
- Links into interview detail and downstream workspace

Charts are optional but should be adapter-friendly.

### FR-17: Downstream actions

The reusable core must emit events or call configured actions after milestones:

- Interview created
- Message appended
- Attachment analyzed
- Interview ready
- Specification generated
- Specification submitted
- Changes requested
- Specification approved

Possible destination adapters:

- In-app task
- Email notification
- Teams/Slack/Telegram notification
- Webhook
- Ticket/issue creation
- Document generation
- Module/app workspace build
- CRM or project management system

### FR-18: Auditability

The system must audit:

- Interview creation
- Public session creation
- Message turns where required
- Attachment uploads and analyses
- Status transitions
- Specification generation
- PRD generation, edits, regeneration, staging, and deployment
- Approval actions
- Configuration changes
- Downstream build/action triggers

## 8. Non-Functional Requirements

### NFR-1: Portability

The core must be deployable on another Next.js site with minimal changes.

Required isolation:

- No hard-coded company name in prompts, labels, or fallback text.
- No hard-coded department names.
- No fixed route assumptions outside the package boundary.
- No fixed notification provider.
- No fixed AI provider.
- No fixed Firestore collection names.
- No unconditional dependency on GitHub/Vercel build workflows.

### NFR-2: Security

- Server-side validation for every request.
- Zod or equivalent schema validation.
- Tenant scoping on every document and query.
- Public session token generated with secure random bytes.
- HTTP-only cookies.
- Upload size and file type limits.
- Optional malware/content scanning hook.
- Rate limiting by client key and endpoint.
- Least-privilege reads for public category lists.
- Secrets stored in server environment or secret manager only.
- No secrets in transcripts, logs, source code, or analytics.

### NFR-3: Privacy and data protection

- Clearly disclose how respondent identity, responses, and attachments are used.
- Treat respondent name and optional contact fields as personal data subject to tenant retention and deletion policies.
- Allow attachment text extraction retention to be configurable.
- Support retention policies and deletion/export requests.
- Avoid sending file binaries or full extracted text to the AI provider unless required and disclosed.
- Redact or omit credentials discovered in uploads where feasible.
- Separate public visitor identity from authenticated user identity.

### NFR-4: Reliability

- AI provider timeout handling; current request timeout is 60 seconds.
- Deterministic fallback interviewer when provider is unavailable.
- Safe retry behavior for specification generation.
- Transaction/concurrency checks for message updates and version generation.
- Idempotency for downstream actions where possible.

### NFR-5: Performance

- Limit prompt history; current interview prompt uses the last 40 messages and specification prompt uses the last 60 messages.
- Cache category lists where appropriate.
- Avoid large attachment text in every prompt; use summaries/truncated extracts.
- Support incremental loading for long transcripts in UI.

### NFR-6: Accessibility and UX

- Keyboard-accessible chat input and upload controls.
- Screen-reader-friendly status and readiness indicators.
- Mobile-friendly chat layout.
- Clear empty, loading, error, and offline states.
- Localizable labels and prompt templates.

### NFR-7: Observability

Track:

- Interview starts by mode/template/category
- Completion rate
- Time to readiness
- Message count per completed interview
- AI provider errors and fallback usage
- Attachment success/failure by file type
- Specification generation and approval counts
- Downstream action success/failure

## 9. Data Model

### 9.1 Tenant/interview template

```ts
InterviewTemplate {
  id: string;
  tenantId: string;
  slug: string;
  name: string;
  description?: string;
  audience: "public" | "authenticated" | "both";
  categoryPicker: {
    enabled: boolean;
    source: "departments" | "custom_options" | "external";
    allowFreeText: boolean;
  };
  branding: {
    productName: string;
    companyName?: string;
    logoUrl?: string;
    primaryColor?: string;
    introText?: string;
    completionText?: string;
  };
  assistant: {
    systemPrompt: string;
    model?: string;
    temperature?: number;
    fallbackMode: "deterministic" | "disabled";
  };
  coverageTopics: CoverageTopic[];
  factSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  completion: {
    requireAllCoverage: boolean;
    requireNoUnresolvedQuestions: boolean;
    minimumMessages?: number;
  };
  postActions: PostActionConfig[];
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 9.2 Department/category

```ts
InterviewCategory {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  description?: string;
  ownerIds: string[];
  memberIds: string[];
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 9.3 Interview

```ts
Interview {
  id: string;
  tenantId: string;
  templateId: string;
  categoryId?: string;
  title: string;
  task?: string;
  status: "draft" | "interviewing" | "ready_for_review" | "completed";
  source: "portal" | "public" | "embedded" | "api";
  createdBy?: ActorReference;
  respondent: {
    name: string;
    categoryId?: string;
    categoryName?: string;
    contactEmail?: string;
  };
  publicSession?: {
    tokenHash: string;
    expiresAt?: Timestamp;
  };
  messages: InterviewMessage[];
  facts: Record<string, unknown>;
  coverage: Record<string, boolean>;
  unresolvedQuestions: string[];
  readyForOutput: boolean;
  attachments: AttachmentAnalysis[];
  latestOutputVersion?: number;
  model?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

Recommendation for portability: store a hash of the public session token rather than the raw token when refactoring.

### 9.4 Message

```ts
InterviewMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  attachmentIds?: string[];
  createdAt: string;
}
```

### 9.5 Attachment analysis

```ts
AttachmentAnalysis {
  id: string;
  fileName: string;
  fileType: string;
  sizeBytes: number;
  uploadedAt: string;
  summary: string;
  extractedText: string;
  structuredData?: Record<string, unknown>;
  suggestedQuestions: string[];
  retentionStatus?: "metadata_only" | "analysis_stored" | "source_stored";
}
```

### 9.6 Specification/output

```ts
InterviewOutput {
  id: string;
  tenantId: string;
  interviewId: string;
  categoryId?: string;
  title: string;
  version: number;
  status: "draft" | "user_review" | "approved" | "changes_requested" | "superseded";
  canonicalHash: string;
  sections: Record<string, unknown>;
  changeSummary?: string;
  approval?: ApprovalRecord;
  createdBy?: ActorReference;
  model?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 9.7 Requirements PRD

```ts
InterviewPrd {
  id: string;
  tenantId: string;
  interviewId: string;
  categoryId?: string;
  title: string;
  version: number;
  status: "draft" | "in_review" | "staged" | "deploying" | "deployed" | "superseded" | "archived";
  requestKind: "new_app" | "existing_app_enhancement" | "uncertain";
  targetApp?: {
    slug: string;
    name: string;
    reason: string;
    confidence: number;
  };
  classificationReason: string;
  executiveSummary: string;
  content: string;
  sections: Record<string, unknown>;
  dataSharingOpportunities: DataSharingRecommendation[];
  integrationRecommendations: NamedItem[];
  adminNotes?: string;
  canonicalHash: string;
  specificationId?: string;
  latestBuildId?: string;
  moduleSlug?: string;
  productionUrl?: string;
  deployedAt?: Timestamp;
  createdBy?: ActorReference;
  model?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

DataSharingRecommendation {
  appSlug: string;
  appName: string;
  direction: "read" | "write" | "bidirectional";
  dataEntities: string[];
  recommendation: string;
  benefit: string;
}
```

### 9.8 Audit event

```ts
InterviewAuditEvent {
  id: string;
  tenantId: string;
  entityType: "interview" | "attachment" | "output" | "prd" | "template" | "category" | "action";
  entityId: string;
  action: string;
  actor?: ActorReference;
  detail?: Record<string, unknown>;
  createdAt: Timestamp;
}
```

## 10. API Requirements

### Public APIs

```http
GET  /api/interview/templates/[slug]/categories
POST /api/interview/templates/[slug]/sessions
POST /api/interview/sessions/[id]/messages
POST /api/interview/sessions/[id]/attachments
GET  /api/interview/sessions/[id]/status
```

Current Adams routes can remain compatibility routes:

```http
GET  /api/public/interview
POST /api/public/interview
POST /api/public/interview/[id]/messages
POST /api/public/interview/[id]/attachments
```

Public session creation request:

```json
{
  "respondentName": "Full Name",
  "departmentId": "department-or-category-id"
}
```

### Authenticated APIs

```http
GET    /api/interviews
POST   /api/interviews
GET    /api/interviews/[id]
PATCH  /api/interviews/[id]
POST   /api/interviews/[id]/messages
POST   /api/interviews/[id]/attachments
GET    /api/interviews/[id]/outputs
POST   /api/interviews/[id]/outputs
PATCH  /api/outputs/[id]
POST   /api/outputs/[id]/approve
POST   /api/outputs/[id]/actions
```

Authenticated interview creation request:

```json
{
  "respondentName": "Full Name",
  "departmentId": "department-or-category-id",
  "title": "Interview title",
  "task": "Optional process seed"
}
```

### Admin APIs

```http
GET/POST/PATCH /api/interview-admin/templates
GET/POST/PATCH /api/interview-admin/categories
GET            /api/interview-admin/audit-events
GET            /api/interview-admin/metrics
GET            /api/interview-admin/health
GET    /api/interview-admin/prds
POST   /api/interview-admin/prds
GET    /api/interview-admin/prds/[id]
PATCH  /api/interview-admin/prds/[id]
POST   /api/interview-admin/prds/[id]/regenerate
POST   /api/interview-admin/prds/[id]/deploy
```

Current Adams Admin PRD routes:

```http
GET   /api/admin/interview-prds
POST  /api/admin/interview-prds
GET   /api/admin/interview-prds/[id]
PATCH /api/admin/interview-prds/[id]
POST  /api/admin/interview-prds/[id]/regenerate
POST  /api/admin/interview-prds/[id]/deploy
```

### Webhook events

```json
{
  "event": "interview.output.approved",
  "tenantId": "...",
  "interviewId": "...",
  "outputId": "...",
  "version": 3,
  "canonicalHash": "...",
  "occurredAt": "..."
}
```

## 11. Configuration Requirements

### Required environment variables

```env
DATABASE_PROVIDER=firestore
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

AI_PROVIDER=openai-compatible
AI_BASE_URL=
AI_API_KEY=
AI_MODEL=
```

### Optional environment variables

```env
INTERVIEW_DEFAULT_TEMPLATE=
INTERVIEW_PUBLIC_ENABLED=true
INTERVIEW_ATTACHMENT_MAX_MB=15
INTERVIEW_RATE_LIMIT_WINDOW_MS=60000
INTERVIEW_RATE_LIMIT_MAX=40
INTERVIEW_SESSION_COOKIE_DAYS=30
INTERVIEW_AI_TIMEOUT_MS=60000
INTERVIEW_FALLBACK_ENABLED=true
WEBHOOK_SIGNING_SECRET=
NEXT_PUBLIC_APP_URL=
```

### Current implementation mappings

| Current variable | Reusable equivalent |
| --- | --- |
| `HERMES_API_URL` | `AI_BASE_URL` |
| `HERMES_API_KEY` | `AI_API_KEY` |
| `HERMES_MODEL` | `AI_MODEL` |
| `FIREBASE_SERVICE_ACCOUNT_KEY*` | Database credential adapter |
| `HERMES_BUILD_WORKSPACE` | Optional downstream build adapter |
| `GITHUB_*` | Optional module-build adapter |
| `CRON_SECRET` | Scheduled action adapter |

## 12. Architecture Recommendations

### Recommended package boundaries

```text
packages/interview-core/
  domain/
    types.ts
    schemas.ts
    coverage.ts
    facts.ts
    specification.ts
  services/
    interview-engine.ts
    attachment-analyzer.ts
    output-generator.ts
    prd-analyzer.ts
    session-service.ts
    audit-service.ts
  ports/
    ai-provider.ts
    auth-provider.ts
    app-catalog.ts
    build-orchestrator.ts
    database.ts
    rate-limiter.ts
    storage.ts
    notifier.ts
    action-dispatcher.ts

packages/interview-next/
  api/
  components/
  adapters/
    firestore.ts
    hermes-openai-compatible.ts
    firebase-auth.ts
    memory-rate-limiter.ts

apps/site/
  app/interview/page.tsx
  app/api/interview/...
```

### Core principle

The domain engine should not import Next.js, Firebase, Vercel, GitHub, or Adams-specific services. It should receive dependencies through interfaces.

## 13. Reuse and Customization Matrix

| Capability | Required for reuse | Configuration mechanism |
| --- | --- | --- |
| Branding and product name | Yes | Template/branding config |
| Department picker | Yes | Category adapter |
| Coverage topics | Yes | Template config |
| Guided fallback | Recommended | Template config |
| AI endpoint | Yes | AI provider adapter |
| Public mode | Optional | Feature flag/template audience |
| Authenticated mode | Recommended | Auth adapter |
| Attachments | Optional | Parser registry/feature flag |
| Versioned specification | Recommended | Output generator config |
| Approval workflow | Optional | Workflow config |
| Dashboard | Optional | UI package |
| Module/app generation | Optional | Post-action adapter |
| Live app catalog analysis | Optional | App-catalog adapter |
| PRD regeneration/staging | Optional | Admin workflow config |
| Production deployment | Optional | Build-orchestrator adapter |
| Email/chat notifications | Optional | Notification adapter |
| Multi-tenant support | Recommended | Tenant ID + scoped queries |

## 14. Data Migration and Export

The reusable tool must support:

- Export interview JSON including messages, facts, coverage, attachments analysis, and outputs.
- Export specification as JSON and Markdown/PDF.
- Tenant-level export for migration.
- Deletion of an interview and associated outputs/audit references subject to retention policy.
- Mapping current Adams `ProcessInterviewDoc` and `SolutionSpecificationDoc` into portable schemas.

### Compatibility migration

Maintain read adapters for existing fields:

- `ProcessInterviewDoc` → `Interview`
- `SolutionSpecificationDoc` → `InterviewOutput`
- `InterviewPrdDoc` → `InterviewPrd`
- `departmentId` → `categoryId`
- `readyForSpecification` → `readyForOutput`
- `respondentName`/`createdByName` → `respondent.name`
- `publicSessionToken` → `publicSession.tokenHash`

## 15. Security Requirements and Threat Model

### Public abuse

Risks:

- Spam interview creation
- Excessive AI spend
- Malicious uploads
- Session hijacking
- Enumeration of interview IDs

Mitigations:

- Per-IP/client rate limits
- Optional CAPTCHA/Turnstile for public starts and uploads
- Random session token
- Token hashing
- File size/type limits
- Non-enumerating error responses
- Optional domain allowlist for embedding

### Prompt injection

Risks:

- User asks assistant to reveal system prompt or ignore coverage requirements.
- Uploaded document contains malicious instructions.

Mitigations:

- Treat user and document text as data, not instructions.
- Keep structured-output schema validation.
- Limit tool access; the interviewer should not execute arbitrary actions.
- Sanitize attachment-derived instructions.
- Log provider failures without exposing prompts/secrets.

### Data leakage

Risks:

- Public category endpoint leaks sensitive department data.
- Extracted attachment text contains PII/secrets.
- Transcript is exposed to unauthorized users.

Mitigations:

- Return only category `id`, `name`, and `code` publicly.
- Tenant/role-scoped reads.
- Configurable retention and redaction.
- Avoid logging raw file contents or prompts containing secrets.

## 16. Acceptance Criteria

### Core interview

- [ ] A site admin can configure an active interview template without changing source code.
- [ ] Every interview records the respondent's full name and selected department/category.
- [ ] A user can start an interview from a template.
- [ ] The assistant asks one question at a time.
- [ ] Coverage state updates after each turn.
- [ ] Readiness is blocked until required coverage is complete.
- [ ] A completed interview produces a machine-readable output.

### Public mode

- [ ] A visitor must provide a full name and select a department/category before an interview is created.
- [ ] A visitor can start without sign-in.
- [ ] A visitor can continue only with the correct session cookie.
- [ ] A visitor cannot access another visitor's interview.
- [ ] Public endpoints are rate limited.
- [ ] Session token is not returned in response bodies.

### Attachments

- [ ] Supported file types are configurable.
- [ ] Oversized or unsupported files fail safely.
- [ ] Spreadsheet analysis captures sheets, columns, formulas, row counts, and samples.
- [ ] Attachment analysis produces contextual follow-up questions.

### Specification and approval

- [ ] Each generation increments version.
- [ ] Canonical hash changes when content changes.
- [ ] Approved output cannot be silently overwritten.
- [ ] Approval captures actor, role, timestamp, note, and hash.
- [ ] Configured post-approval actions execute once and audit their result.

### Admin PRD workflow

- [ ] An admin can view and filter every submitted interview.
- [ ] A generated PRD compares the request against the live app/module catalog.
- [ ] The PRD identifies new-app versus enhancement requests with a visible reason and confidence.
- [ ] The PRD recommends data-sharing opportunities with existing apps.
- [ ] An admin can edit PRD content and save contextual notes.
- [ ] Regeneration creates a new version, uses prior context, and supersedes prior versions.
- [ ] Accepted PRDs enter a staging queue and cannot deploy before staging.
- [ ] Only server-authorized admins can stage or deploy a PRD.
- [ ] A deployed PRD records module/build identifiers and production URL where available.

### Portability

- [ ] Product can run with a different company name, departments, topics, and output schema through configuration.
- [ ] Core engine has no direct dependency on Adams Electric services.
- [ ] AI, auth, database, rate limit, notifications, and downstream actions are adapters.
- [ ] Existing Adams data can be read through a compatibility adapter or migration.

## 17. Implementation Phases

### Phase 1 — Extract portable domain

- Move coverage, fact merging, readiness, message types, and specification hashing into a provider-agnostic core.
- Rename Adams-specific labels to configurable template labels.
- Preserve current behavior through adapters.

### Phase 2 — Configuration and template system

- Add interview template documents/schema.
- Move required topics, prompts, guided fallback questions, branding, and completion text into templates.
- Add admin template management.

### Phase 3 — Provider abstraction

- Abstract Hermes as an OpenAI-compatible AI provider.
- Add provider health checks and deterministic fallback.
- Abstract Firestore, auth, rate limiting, audit, and storage.

### Phase 4 — Public/embeddable package

- Package `PublicInterview` as a configurable component.
- Add template slug, category picker mode, branding props, and completion callback.
- Add optional embed script or iframe-safe route if needed.

### Phase 5 — Requirements and downstream actions

- Add a provider-agnostic PRD analyzer that consumes a deployment's app catalog.
- Add editable/versioned PRD records, regeneration context, staging, and deployment states.
- Define event dispatcher contract.
- Add webhook delivery with signatures and retries.
- Make module build/workspace generation one optional adapter.

### Phase 6 — Hardening

- Hash public session tokens.
- Add optional CAPTCHA and attachment scanning hooks.
- Add retention/deletion/export jobs.
- Add multilingual prompt/template support.

## 18. Current Implementation Assets

### Domain/types

- `lib/adams-harness/types.ts`
- `lib/adams-harness/interview.ts`
- `lib/adams-harness/specification.ts`
- `lib/adams-harness/attachment-analyzer.ts`
- `lib/adams-harness/prd-generator.ts`
- `lib/adams-harness/interview-prds.ts`
- `lib/adams-harness/server-store.ts`
- `lib/adams-harness/rate-limit.ts`

### Public UI and APIs

- `components/marketing/public-interview.tsx`
- `app/(marketing)/interview/page.tsx`
- `app/api/public/interview/route.ts`
- `app/api/public/interview/[id]/messages/route.ts`
- `app/api/public/interview/[id]/attachments/route.ts`

### Authenticated UI and APIs

- `app/(portal)/portal/solutions/page.tsx`
- `app/(portal)/portal/solutions/new/page.tsx`
- `app/(portal)/portal/solutions/[id]/page.tsx`
- `app/api/adams-harness/interviews/route.ts`
- `app/api/adams-harness/interviews/[id]/route.ts`
- `app/api/adams-harness/interviews/[id]/messages/route.ts`
- `app/api/adams-harness/interviews/[id]/attachments/route.ts`
- `app/api/adams-harness/interviews/[id]/specification/route.ts`
- `app/api/adams-harness/specifications/[id]/route.ts`
- `app/api/adams-harness/specifications/[id]/approve/route.ts`
- `app/api/adams-harness/specifications/[id]/build/route.ts`

### Admin PRD UI and APIs

- `app/(portal)/portal/admin/interviews/page.tsx`
- `app/api/admin/interview-prds/route.ts`
- `app/api/admin/interview-prds/[id]/route.ts`
- `app/api/admin/interview-prds/[id]/regenerate/route.ts`
- `app/api/admin/interview-prds/[id]/deploy/route.ts`

## 19. Recommended Decisions for Other Sites

Before deployment, each site should decide:

1. Is the interview public, authenticated, embedded, or API-only?
2. What respondent identity fields are required—minimum full name—and what categories replace departments?
3. What discovery topics are required?
4. What output should be generated: requirements spec, onboarding brief, assessment, proposal, ticket, or custom JSON?
5. Who can review and approve outputs?
6. What happens after approval?
7. Which AI provider/model is approved?
8. Which file types may be uploaded?
9. How long transcripts and extracted attachment text are retained?
10. What branding, language, and compliance disclosures are required?
