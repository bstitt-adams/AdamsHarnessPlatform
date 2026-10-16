# Adams Platform

**Adams Electric — Build Trust Through Performance**

A modern **Next.js 16** internal business and AI operations platform built for **Adams Electric** (`https://adams-electric.com`), unifying process discovery interviews, versioned solution specifications, standardized Solution App Workspaces, **AdamsBrain / GBrain** knowledge repositories, **Hermes Agent** integration, **Adams Learning Academy (LMS)**, and **Mission Critical Safety** operations.

- **Production URL:** `https://adams-platform.vercel.app`
- **GitHub Repository:** `https://github.com/bstitt-adams/AdamsHarnessPlatform`

---

## Core Architecture & Enhancements

### 1. Public & Internal AI Process Discovery (`/interview` & `/portal/solutions`)
- **Unauthenticated & Portal Process Interviews**: Any Adams Electric team member can select a department (`Safety`, `Preconstruction`, `Project Delivery`, `Service`, `Finance`, `People & Culture`) and complete a guided AI requirements interview covering 15 structured operational topics (`Trigger`, `Frequency`, `Current steps`, `Actors`, `Systems`, `Copied data`, `Pain points`, `Desired process`, `Notifications`, `Completion evidence`, `Timing & escalation`, `Exceptions`, `Compliance`, `Integrations`, `Human approvals`).
- **Versioned Solution Specifications**: Completed interviews generate SHA-256 hashed, versioned specifications (`solutionSpecifications`) with department owner review and approval workflows.

### 2. Standardized Solution App Interface (`/portal/modules/[slug]`)
Every Interview Idea to Solution automatically provisions a full **Solution App Workspace** featuring:
- **Live Data Metrics Dashboard**: Configurable KPI cards (total items, active/open count, completion rate %, overdue items, and custom AI-defined metrics).
- **AI Recommended Charts & Graphs**: Interactive Recharts visualizations (`bar`, `line`, `pie`, `area`) with an inline AI prompt bar to generate new charts on the fly.
- **Global Search & Filterable Table**: Instant search across all fields, notes, tags, extended attributes, and IDs, plus per-column filters and customizable visible columns.
- **Item Detail Pages (`/portal/modules/[slug]/records/[id]`)**: Dedicated detail view storing extended fields not shown in the summary table (root cause, resolution notes, external PO/ticket references, custom key-value attributes, tags, and timestamped activity comments).
- **Solution App Settings & API (`/portal/modules/[slug]/settings`)**:
  - Toggle visible table columns
  - Customize metrics and charts using natural-language AI prompts
  - Configure event triggers (`record_created`, `record_updated`, `status_completed`, `overdue`) and AI automations/notifications (In-App, Telegram, Microsoft Teams, or outbound Webhooks)
  - Generate authenticated external REST API keys (`X-API-Key`) for `GET / POST /api/public/modules/[slug]`

### 3. AdamsBrain & GBrain Knowledge Hub (`/portal/admin/adams-brain` & `/portal/adams-brain`)
Built around the [`garrytan/gbrain`](https://github.com/garrytan/gbrain) opinionated agent knowledge architecture:
- **Multi-Repository Management**: Create department-scoped or admin-only GBrain repositories for SOPs, FAQs, and system references.
- **In-App GBrain Page Authoring**: Author structured Markdown pages (`sop`, `faq`, `module_reference`, `entity`, `document`) with YAML frontmatter, **`## Compiled Truth`**, and append-only **`## Timeline & Evidence`**.
- **Document Upload & Live Platform Connectors**: Upload `.pdf`, `.docx`, `.md`, and `.txt` files, or one-click sync live platform data (**Approved Solution Specifications**, **Solution Module Schemas**, **Live Solution Module Records**, **Company Safety Calendars**, **Assigned User Assets**, and **System Documentation**).
- **GitHub GBrain Sync & `RESOLVER.md` Generation**: Compile all indexed sources into `garrytan/gbrain` folder layout with an auto-generated `RESOLVER.md` index and sync to GitHub or download as a bundle.
- **Hermes Agent REST / MCP Endpoint (`/api/public/gbrain`)**: Exposes per-repository `X-API-Key` endpoints for querying and writing GBrain pages, and automatically grounds answers in Portal Q&A, **Telegram**, and **Microsoft Teams**.

### 4. My Mission Critical (User-Scoped Workspace)
Located at the top of the left portal navigation, automatically filtered to the signed-in user (or the currently masqueraded user):
- **My Tasks (`/portal/my-tasks`)**: Personal To-Dos, Quarterly Rocks, and Action Items with quick creation and completion toggles.
- **My Assets (`/portal/my-assets`)**: View assigned equipment (`laptop`, `cell phone`, `ipad`, `vehicle`, `hotspot`, or custom asset types). Includes **Admin Controls** to assign assets to any user and modify the list of tracked asset types.
- **My Training and Certs (`/portal/my-training`)**: Personal Adams Learning Academy course enrollments, progress bars, and earned certificates.
- **My Orders (`/portal/my-orders`)**: Personal material and equipment order requests and delivery tracking.
- **My Ideas (`/portal/my-ideas`)**: Submit process improvement ideas and track personal AI solution interviews.

### 5. Mission Critical Operations
- **Multi-Site Bilingual Safety Calendar (`/safety-calendar` & `/calendar-admin`)**: English/Spanish jobsite safety office TV display calendars (Conover NC, Charlotte NC, Southern Virginia, Charleston SC, Greenville SC) with PIN protection.
- **Adams Learning Academy (`/academy` & `/portal/admin/academy`)**: Electrical construction training catalog, course management, learner tracking, and branded completion certificates.
- **Certification Tracker (`/portal/admin/academy/certificates`)**
- **Vehicle Inspection (`/portal/vehicle-inspection`)**
- **Safety Request Box (`/portal/safety-request-box`)**
- **Order Tracking (`/portal/order-tracking`)**
- **MindChuk Clone (`/portal/mindchuk-clone`)**

### 6. Admin, Security, & Masquerading Controls
- **Live User & Role Masquerading**: Admins and SuperAdmins can preview the entire platform as any active Adams Electric Team Member or role (`SuperAdmin`, `Admin`, `Team Member`, `Affiliate`, `Consultant`) from the top header, sidebar footer, or **Settings → Feature Visibility** without signing out.
- **Role-Based Feature Visibility (`/portal/settings?tab=visibility`)**: Toggle any sidebar section or admin menu item on or off per role.
- **Left Navigation Quick Search**: Real-time filter input at the top of the left sidebar that searches across all navigation items and auto-expands matching sections.
- **Team Members & Firebase Auth Sync (`/portal/admin/team-members`)**: One-click synchronization between Firebase Authentication accounts and Firestore `teamMembers` records, plus direct creation of new Firebase Auth users + Team Member profiles.
- **Platform Development Tracker (`/portal/admin/platform-development`)**: SuperAdmin module for logging platform engineering tasks, hours, connected systems, and AI capabilities, with on-demand and automated Friday 6:00 PM Base64 PDF executive reports stored in Firestore.
- **Unified Integrations Hub (`/portal/settings?tab=integrations`)**:
  - **LLM Configuration**
  - **Hermes Integration** (Local `http://127.0.0.1:8642` or Remote HTTPS tunnel)
  - **AdamsBrain (GBrain)**
  - **Telegram via Hermes** (with multi-user Hermes access management)
  - **Microsoft Teams via Hermes** (with Bot Framework verification and multi-user Hermes access management)

---

## Tech Stack

- **Framework:** Next.js 16 (App Router, Turbopack)
- **Language:** TypeScript (Strict Mode)
- **Database & Storage:** Firebase Firestore, Firebase Admin SDK, Firebase Storage
- **Authentication:** Firebase Authentication + Server-side Team Member Role Sync
- **AI & Agent Runtime:** Hermes Agent (`/v1/chat/completions` & `/v1/runs`), GBrain Knowledge Engine, OpenAI / Anthropic compatible providers
- **UI & Charts:** Tailwind CSS v4, Radix UI / shadcn/ui, Recharts, Lucide Icons
- **PDF Generation:** `jsPDF`

---

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables (`.env.local`)

```env
NODE_ENV=development

# Firebase Client SDK
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=adamselectharnessplatform.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=adamselectharnessplatform
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=adamselectharnessplatform.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...

# Firebase Admin SDK (either inline JSON, file path, or client email + private key)
FIREBASE_PROJECT_ID=adamselectharnessplatform
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-...@adamselectharnessplatform.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Hermes Agent (Local or Remote)
HERMES_API_URL=http://127.0.0.1:8642
HERMES_API_KEY=your-hermes-api-server-key
HERMES_MODEL=hermes-agent

# Optional: OpenAI & Cron Secret for Weekly Development PDF Reports
OPENAI_API_KEY=sk-...
CRON_SECRET=your-cron-secret
```

### 3. Seed Initial Data & Deploy Firestore Rules

```bash
# Seed core departments, team members, safety calendars, and academy data
npm run seed:firebase:all

# Deploy Firestore security rules
npx firebase-tools deploy --only firestore:rules --project adamselectharnessplatform
```

### 4. Start Development Server

```bash
npm run dev
```

Open `http://localhost:3000`.

---

## Connecting Local Hermes Agent

1. In your local Hermes `.env` (`~/.hermes/.env` or `C:\Users\<User>\AppData\Local\hermes\.env`), enable the OpenAI-compatible API server:
   ```env
   API_SERVER_ENABLED=true
   API_SERVER_KEY=adams-hermes-secret-2026
   ```
2. Start or restart the Hermes gateway:
   ```bash
   hermes gateway restart
   ```
   Hermes will listen on `http://127.0.0.1:8642`.
3. In Adams Platform, open **Settings → Integrations → Hermes Integration** (`/portal/settings?tab=hermes`), set the URL and `API_SERVER_KEY`, click **Test Hermes**, and save.

---

## License

Proprietary — **Adams Electric Company** (`https://adams-electric.com`)
