# Adams Platform

**Adams Electric — Build Trust Through Performance**

A modern **Next.js 16** internal business and AI operations platform built for **Adams Electric** (`https://adams-electric.com`), unifying process discovery interviews, versioned solution specifications, standardized Solution App Workspaces, **AdamsBrain / GBrain** knowledge repositories, **Hermes Agent** integration, **Adams Learning Academy (LMS)**, and **Mission Critical Safety** operations.

- **Production URL:** `https://adams-platform.vercel.app`
- **GitHub Repository:** `https://github.com/bstitt-adams/AdamsHarnessPlatform`

---

## Core Architecture & Enhancements

### 1. Public & Internal AI Process Discovery (`/interview` & `/portal/solutions`)
- **Unauthenticated & Portal Process Interviews**: Any Adams Electric team member can select a department (`Safety`, `Preconstruction`, `Project Delivery`, `Service`, `Finance`, `People & Culture`) and complete a guided AI requirements interview covering 15 structured operational topics (`Trigger`, `Frequency`, `Current steps`, `Actors`, `Systems`, `Copied data`, `Pain points`, `Desired process`, `Notifications`, `Completion evidence`, `Timing & escalation`, `Exceptions`, `Compliance`, `Integrations`, `Human approvals`).
- **Multi-Format Attachment Upload & AI Spreadsheet/Document Analysis**: Upload **Excel (`.xlsx`, `.xls`, `.csv`)**, **PowerPoint (`.pptx`, `.ppt`)**, **Word (`.docx`, `.doc`)**, **Adobe PDF (`.pdf`)**, **Markdown (`.md`)**, and **Text (`.txt`)** files at the start of or during any interview. Automatically extracts worksheet names, column headers, Excel formulas, and slide text, asks targeted follow-up questions on how the spreadsheet or document works, and maps spreadsheet columns into the generated specification's `dataEntities`.
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
- **4-Step Data Import & Hermes Storage Wizard**: Guided wizard to select or create a repository, upload files (`.pdf`, `.docx`, `.md`, `.txt`, `.csv`, `.json`), paste structured SOP/FAQ entries, import across 8 live Adams Platform datasets (`Approved Solution Specifications`, `Solution Module Schemas`, `Live Solution Module Records`, `Company Safety Calendars`, `Assigned User Assets`, `Workforce Training & Certifications`, `Command Control Opportunities & Projects`, `Platform System Documentation`), and compile `RESOLVER.md` + `HERMES_MEMORY.json` directly into the Hermes Harness.
- **Interactive Multi-Repository Chat**: Switch between individual repositories or **"All Active Repositories"** global search mode, ask broad or specific questions with cited source cards, or click **"Ask About This Source"** from the Stored Sources explorer.
- **In-App GBrain Page Authoring**: Author structured Markdown pages (`sop`, `faq`, `module_reference`, `entity`, `document`) with YAML frontmatter, **`## Compiled Truth`**, and append-only **`## Timeline & Evidence`**.
- **GitHub GBrain Sync & `RESOLVER.md` Generation**: Compile all indexed sources into `garrytan/gbrain` folder layout with an auto-generated `RESOLVER.md` index and sync to GitHub or download as a bundle.
- **Hermes Agent REST / MCP Endpoint (`/api/public/gbrain`)**: Exposes per-repository `X-API-Key` endpoints for querying and writing GBrain pages, and automatically grounds answers in Portal Q&A, **Telegram**, and **Microsoft Teams**.

### 4. My Mission Critical (User-Scoped Workspace)
Located at the top of the left portal navigation, automatically filtered to the signed-in user (or the currently masqueraded user):
- **My Tasks & MindChuk Feed (`/portal/my-tasks` & `/portal/mindchuk-clone`)**: Implements **MindChuk — For Minds That Never Turn Off** (`https://mindchuk.com/`). Instant brain-dump capture for tasks, notes/thoughts, ideas, saved links (`https://...`), Base64 photo/file attachments, and scheduled reminders with auto-extracted `#hashtags`, interactive `#tag` filter cloud, Pinning, Convert-to-Task, Mark Done / Reopen / Delete, Feed vs. Table view toggle, and automatic sync to the **Adams Master Calendar**.
- **My Assets (`/portal/my-assets`)**: View assigned equipment (`laptop`, `cell phone`, `ipad`, `vehicle`, `hotspot`, or custom asset types). **Admin / SuperAdmin-only Controls** allow assigning assets to any user and modifying the list of tracked asset types.
- **My Training and Certs (`/portal/my-training`)**: Upload training or certification attachment artifacts in **Base64 format** (`userTrainingCerts`) with credential metadata and a **required Expiration Date**, track `Active / Expiring Soon / Expired` status badges, preview/download artifacts inline, and automatically sync completion & expiration dates to the **Adams Master Calendar**.
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
- **Asset Manager (`/portal/admin/asset-manager`)**: Local equipment inventory and assignment lifecycle with OAuth-backed Jamf Pro and NinjaOne synchronization, provider CRUD capability tests, remote asset links, bidirectional sync, and actionable target-platform remediation errors.
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

# Optional server-side asset integration fallbacks (the Asset Manager UI can
# also store these securely in platformSecrets/platformSettings)
JAMF_BASE_URL=https://your-tenant.jamfcloud.com
JAMF_CLIENT_ID=your-jamf-client-id
JAMF_CLIENT_SECRET=your-jamf-client-secret
NINJAONE_REGION=app
NINJAONE_CLIENT_ID=your-ninjaone-client-id
NINJAONE_CLIENT_SECRET=your-ninjaone-client-secret
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

## Hermes in Docker (local) and Azure Container Apps (remote)

Settings → Integrations → Hermes controls which Hermes container the platform
targets: **Local Hermes (Docker)**, **Remote Hermes (Azure)**, or
**Environment variables**. Pick a mode, click **Save Settings** (or **Test
Hermes**, which also persists on success) — the switch applies to every Hermes
feature (interviews, module builds, certification tracker, brain sync, asset
suggestions).

The card shows the server-resolved active endpoint (`Active: Docker (local) —
localhost:8000`), per-endpoint reachability via **Check both endpoints**
(non-destructive ping of local + remote), a shared **Model**/**API key**
(stored server-side in `platformSecrets/hermes`), and an optional **Build
workspace path** that overrides `HERMES_BUILD_WORKSPACE` for module builds.

### Local Docker

```bash
# Set your Hermes image, then start
HERMES_IMAGE=<your-hermes-image> docker compose up -d hermes
```

- Default local URL: `http://localhost:8000` (port via `HERMES_PORT`).
- Build workspace: `./hermes-workspace` on the host mounts to `/workspace` in
  the container (`HERMES_WORKSPACE_HOST_PATH` to change). If you set a Build
  workspace path in Settings, use the container path (`/workspace`).
- Local mode only works while the app runs on the same machine. If the app
  itself runs in Docker, use `http://host.docker.internal:8000`.

### Azure Container Apps (remote)

```bash
az group create -n adams-hermes-rg -l eastus
az containerapp env create -n adams-hermes-env -g adams-hermes-rg -l eastus
az containerapp create \
  -n adams-hermes -g adams-hermes-rg \
  --environment adams-hermes-env \
  --image <your-hermes-image> \
  --ingress external --target-port 8000 \
  --secrets hermes-api-token=<key> \
  --env-vars HERMES_API_TOKEN=secretref:hermes-api-token
# Prints an FQDN like https://adams-hermes.<id>.eastus.azurecontainerapps.io
```

Paste that FQDN as the **Remote URL** in Settings → Hermes, choose **Remote
Hermes (Azure)**, click **Test Hermes**, then Save.

> **Production note:** the Vercel deployment cannot reach `localhost` on your
> dev machine — production must use Remote (Azure) or Environment mode.

---

## Deploying the Web App to Azure Container Apps

The production web app runs as the `web` container of the `adams-platform`
Container App (`rg-adams-platform`), alongside the `hermes` sidecar. The image
is built in the cloud with ACR Tasks — no local Docker required — from the
repo `Dockerfile` (Next.js `standalone` output, enabled by `NEXT_OUTPUT=standalone`).

```bash
TAG=$(date +%Y%m%d-%H%M)
# NEXT_PUBLIC_* values are inlined into the client bundle, so pass them as build args.
az acr build -r adamsplatformacr -t adams-web:$TAG \
  --build-arg NEXT_PUBLIC_FIREBASE_API_KEY=... \
  --build-arg NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=... \
  --build-arg NEXT_PUBLIC_FIREBASE_PROJECT_ID=... \
  --build-arg NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=... \
  --build-arg NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=... \
  --build-arg NEXT_PUBLIC_FIREBASE_APP_ID=... \
  --build-arg NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=... \
  --build-arg NEXT_PUBLIC_APP_URL=https://<app-fqdn> \
  --no-logs .
az acr task list-runs -r adamsplatformacr --top 1 -o table   # wait for Succeeded

az containerapp update -n adams-platform -g rg-adams-platform \
  --container-name web --image adamsplatformacr.azurecr.io/adams-web:$TAG
```

- Server secrets (Firebase Admin, Jamf, NinjaOne, Hermes, `CRON_SECRET`) are
  Container App secrets injected at runtime — never baked into the image.
- On Windows, log streaming from `az acr build` can crash with a `charmap`
  encoding error when Next.js prints `▲`; the cloud build keeps running. Use
  `--no-logs` and poll `az acr task list-runs`, or set `PYTHONIOENCODING=utf-8`.
- The app runs in multiple-revision mode: the previous revision stays active at
  0% traffic for instant rollback via `az containerapp ingress traffic set`.

---

## Jamf Pro and NinjaOne Asset Integrations

The Asset Manager can link local `userAssets` records to Jamf Pro and NinjaOne, pull vendor inventory into Adams Platform, push local updates, and use the safest vendor-supported lifecycle for retirement.

### Jamf Pro OAuth setup

1. In Jamf Pro, create an API client or API role/client credential for Adams Platform.
2. Grant the privileges required for the object types you intend to sync:
   - Computers: read/create/update/delete computer inventory
   - Mobile devices: read/update mobile-device inventory; create/delete depend on the tenant's supported API workflows
   - User/location assignment fields used for ownership updates
3. In **Asset Manager → Jamf and NinjaOne Integrations**, enter the tenant URL, OAuth client ID, and client secret.
4. Click **Test**, then **Check CRUD**. If a privilege or endpoint is unavailable, the result lists the target-platform corrections required.

### NinjaOne OAuth setup

1. In NinjaOne, create an **API Services** machine-to-machine application.
2. Enable the **Client Credentials** grant.
3. Enable **Monitoring** for reads and **Management** for writes.
4. Select the correct region and save the one-time client secret securely.
5. In **Asset Manager → Jamf and NinjaOne Integrations**, enter the region, client ID, client secret, and optional organization/location/role IDs.
6. Click **Test**, then **Check CRUD**.

NinjaOne managed devices are normally created by agent enrollment and are retired through decommission rather than hard delete. Unmanaged ITAM records provide the closest full create/read/update/delete lifecycle.

### Sync and lifecycle behavior

- **Pull Assets** imports or matches remote records by serial number, asset tag, or identifier.
- **Push Assets** updates a linked remote record or creates/links a vendor-supported record when available.
- Asset detail pages expose remote links, per-record push/pull, unlink, and a safe retirement action.
- Sync runs and remediation errors are stored in `assetSyncRuns`; remote links are stored in `assetExternalLinks`.
- Secrets stay server-side in `platformSecrets` or server environment variables and are never returned to the browser.

---

## License

Proprietary — **Adams Electric Company** (`https://adams-electric.com`)
