# Enterprise AI Form Builder & Data Analytics Studio — Portable Specification & Database Schema

> **Purpose**: Portable architecture, feature blueprint, and complete database schema (Firestore NoSQL + PostgreSQL Relational DDL) for repurposing the **Enterprise AI Form Builder & Data Analytics Studio** across any `svp-platform` or Next.js App Router deployment.

---

## 1. Feature Overview

The **Enterprise AI Form Builder & Data Analytics Studio** combines the top capabilities of **Qualtrics**, **AirSlate**, **Jotform**, **Formstack**, **Typeform**, **Forms.app**, **Cognito Forms**, **Tally**, and **Paperform** into a single self-hosted Next.js module:

1. **Modern, Intuitive 3-Mode Form Studio**:
   - **Standard Multi-Field Mode** (*Jotform / Formstack / Cognito Forms style*): Multi-column structured form layout.
   - **Conversational One-Question-at-a-Time Mode** (*Typeform / Tally style*): Focused single-question cards with progress bar to maximize completion rates.
   - **Imported PDF / Word Document Overlay Mode** (*AirSlate / DocuSign style*): Upload any `.pdf` or `.docx` form (`POST /api/form-builder/import-document`), automatically extract form labels, and position interactive text fields, lookup dropdowns, and digital signature blocks over the document (`xPercent`, `yPercent`, `widthPercent`, `page`).

2. **19+ Enterprise Form Controls**:
   - **Basic Inputs**: `short_text`, `long_text`, `email`, `phone`, `number`, `currency`, `date`, `datetime`
   - **Choice & Platform Lookups**:
     - `dropdown` (Manual list addition & creation)
     - `platform_lookup` (Live dynamic dropdown populated from platform collections: `team_members`, `departments`, `projects`, `opportunities`, `safety_sites`, `user_assets`, `lms_courses`, or `manual_list`)
     - `radio`, `multi_select`, `yes_no`
   - **Survey & Statistical Research Controls (*Qualtrics / Typeform*)**:
     - `likert_scale` (1–5 or 1–7 quantitative agreement/severity scale)
     - `nps` (0–10 Net Promoter Score benchmark)
     - `rating_stars` (1–5 star quality rating)
   - **Enterprise, Legal & Line-Item Controls (*AirSlate / Cognito Forms / Jotform Sign*)**:
     - `repeating_table` (Multi-row line-item subform for material orders, parts, or crew rosters)
     - `calculated` (Formula-driven field)
     - `file_upload` (Base64 artifact upload for PDFs, photos, certificates, spreadsheets)
     - `signature` (HTML5 Canvas Digital Signature Pad with drawn or typed signature saved as Base64 PNG data URI + timestamp)

3. **AI Expert Form Developer & Senior Data Analyst (`POST /api/form-builder/ai-assist`)**:
   - **AI Form Generation (`mode: "generate"`)**: Builds complete multi-field forms from a natural-language prompt.
   - **AI Data Analyst & Reporting Optimizer (`mode: "optimize_for_reporting"`)**: Audits every question in a form and upgrades free-text inputs into normalized categorical **Dimensions** (`platform_lookup`, `dropdown`, `yes_no`) and quantitative **Metrics** (`likert_scale`, `nps`, `number`, `currency`) so responses can be aggregated into executive KPI cards, Pie charts, Bar charts, and time-series Line charts without manual data cleaning.

4. **Drop-Off Analysis & Question Friction Diagnostics**:
   - Tracks `totalViews`, `totalStarts`, `totalSubmissions`, `completionRatePct`, `avgCompletionSeconds`, and per-question funnel telemetry (`reachedCount`, `completedCount`, `abandonedCount`, `avgTimeSpentSeconds`).
   - Visualizes question-by-question completion vs. drop-off in a Recharts funnel bar chart and flags high-friction questions.

5. **Custom PDF Generation from Responses (`jsPDF`)**:
   - One-click client/server PDF generator (`generateSubmissionPdf`) that renders a branded header, respondent metadata, all field answers, embedded **Digital Signature PNG**, and compliance audit footer.

6. **16+ Built-In Platform & External Integrations + REST API (`/api/public/forms/[slug]`)**:
   - **Internal Platform Routing**: `platform_module_records`, `platform_my_tasks`, `platform_my_orders`, `platform_my_training`, `platform_master_calendar`, `platform_adams_brain`.
   - **External & Messaging Connectors**: `rest_api` (`GET / POST /api/public/forms/[slug]`), `outbound_webhook`, `telegram_alert`, `teams_alert`, `procore`, `autodesk_acc`, `servicetitan`, `sharepoint`, `airslate_docusign`, `quickbooks`.

---

## 2. File & Route Map for Repurposing in Another `svp-platform`

Copy the following files into any `svp-platform` Next.js repository:

| File Path | Purpose |
| :--- | :--- |
| `lib/form-builder/types.ts` | All TypeScript interfaces for forms, controls, overlays, analytics, PDF config, and submissions |
| `lib/form-builder/templates.ts` | 19+ control catalog, 16+ integration connectors, and pre-built form templates |
| `components/portal/form-builder-renderer.tsx` | Reusable `InteractiveFormRunner` (Standard, Conversational, Document Overlay modes), `SignaturePadControl`, and `generateSubmissionPdf` |
| `app/(portal)/portal/form-builder/page.tsx` | Full 6-tab Enterprise AI Form Builder & Data Analytics Studio UI |
| `app/(marketing)/forms/[slug]/page.tsx` | Public/shareable form runner page (`/forms/[slug]`) |
| `app/api/form-builder/import-document/route.ts` | PDF (`.pdf`) and Word (`.docx`) form parser & field overlay generator |
| `app/api/form-builder/ai-assist/route.ts` | AI Form Architect & AI Data Analyst Reporting Optimizer endpoint |
| `app/api/public/forms/[slug]/route.ts` | External REST API (`GET` schema / `POST` submission + integration dispatcher) |

---

## 3. Database Schema

### 3A. Firebase Firestore Collections & Document Schemas (`lib/schema.ts`)

Add the following collection keys to `COLLECTIONS`:

```ts
export const COLLECTIONS = {
  // ...existing collections
  PLATFORM_FORMS: "platformForms",
  PLATFORM_FORM_SUBMISSIONS: "platformFormSubmissions",
} as const;
```

#### Collection 1: `platformForms/{formId}`

```ts
export interface PlatformFormDoc {
  id: string;
  slug: string; // Indexed unique URL slug, e.g. "daily-jobsite-jha-safety-plan"
  title: string;
  description: string;
  category: string;
  departmentId: string;
  status: "draft" | "published" | "archived";
  presentationMode: "standard" | "conversational" | "document_overlay";
  fields: {
    id: string;
    key: string;
    label: string;
    type:
      | "short_text"
      | "long_text"
      | "email"
      | "phone"
      | "number"
      | "currency"
      | "date"
      | "datetime"
      | "dropdown"
      | "platform_lookup"
      | "multi_select"
      | "radio"
      | "yes_no"
      | "likert_scale"
      | "nps"
      | "rating_stars"
      | "ranking"
      | "file_upload"
      | "signature"
      | "repeating_table"
      | "calculated"
      | "section_header";
    required: boolean;
    options?: string[];
    lookupSource?:
      | "team_members"
      | "departments"
      | "projects"
      | "opportunities"
      | "safety_sites"
      | "user_assets"
      | "lms_courses"
      | "manual_list";
    scaleMin?: number;
    scaleMax?: number;
    scaleMinLabel?: string;
    scaleMaxLabel?: string;
    tableColumns?: string[];
    formula?: string;
    overlayPosition?: {
      page: number;
      xPercent: number;
      yPercent: number;
      widthPercent: number;
    };
    reportingCategory?:
      | "dimension"
      | "metric"
      | "identifier"
      | "open_text"
      | "compliance_artifact";
    recommendedChartType?: "bar" | "pie" | "line" | "kpi" | "none";
    aiBestPracticeNote?: string;
  }[];
  importedDocument?: {
    fileName: string;
    fileType: "pdf" | "word";
    extractedText: string;
    base64DataUri?: string;
    pageCount: number;
    importedAt: string;
  };
  integrations: {
    id: string;
    type: string;
    name: string;
    enabled: boolean;
    targetSlugOrUrl?: string;
  }[];
  pdfConfig: {
    enabled: boolean;
    headerTitle: string;
    headerSubtitle: string;
    includeLogo: boolean;
    includeSignatureBlock: boolean;
    includeTimestampAndAuditHash: boolean;
    footerText: string;
  };
  apiKey: string;
  analytics: {
    totalViews: number;
    totalStarts: number;
    totalSubmissions: number;
    completionRatePct: number;
    avgCompletionSeconds: number;
    stepStats: {
      fieldId: string;
      fieldLabel: string;
      reachedCount: number;
      completedCount: number;
      abandonedCount: number;
      avgTimeSpentSeconds: number;
    }[];
  };
  createdByUid: string;
  createdByName: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### Collection 2: `platformFormSubmissions/{submissionId}`

```ts
export interface PlatformFormSubmissionDoc {
  id: string;
  formId: string;
  formSlug: string;
  formTitle: string;
  submittedByUid?: string;
  submittedByName: string;
  submittedByEmail?: string;
  values: Record<string, unknown>; // Keyed by field.key
  signatureDataUri?: string; // Base64 PNG signature
  signatureSignedBy?: string;
  signatureSignedAt?: string;
  completionSeconds: number;
  source: "portal" | "public_link" | "api";
  createdAt: Timestamp;
}
```

#### Firestore Security Rules (`firestore.rules`)

```javascript
match /platformForms/{formId} {
  allow read: if true;
  allow create, update, delete: if isAuthenticated();
}
match /platformFormSubmissions/{subId} {
  allow read: if isAuthenticated();
  allow create: if true;
  allow update, delete: if isAuthenticated();
}
```

---

### 3B. PostgreSQL / Supabase Relational DDL Schema (For SQL-Backed `svp-platform` Deployments)

```sql
CREATE TABLE platform_forms (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'General',
  department_id TEXT NOT NULL DEFAULT 'general',
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
  presentation_mode TEXT NOT NULL DEFAULT 'standard' CHECK (presentation_mode IN ('standard', 'conversational', 'document_overlay')),
  fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  imported_document JSONB,
  integrations JSONB NOT NULL DEFAULT '[]'::jsonb,
  pdf_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  api_key TEXT NOT NULL,
  analytics JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by_uid TEXT NOT NULL,
  created_by_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_platform_forms_slug ON platform_forms(slug);
CREATE INDEX idx_platform_forms_department ON platform_forms(department_id);

CREATE TABLE platform_form_submissions (
  id TEXT PRIMARY KEY,
  form_id TEXT NOT NULL REFERENCES platform_forms(id) ON DELETE CASCADE,
  form_slug TEXT NOT NULL,
  form_title TEXT NOT NULL,
  submitted_by_uid TEXT,
  submitted_by_name TEXT NOT NULL,
  submitted_by_email TEXT,
  values JSONB NOT NULL DEFAULT '{}'::jsonb,
  signature_data_uri TEXT,
  signature_signed_by TEXT,
  signature_signed_at TIMESTAMPTZ,
  completion_seconds INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'portal' CHECK (source IN ('portal', 'public_link', 'api')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_platform_form_submissions_form_id ON platform_form_submissions(form_id);
CREATE INDEX idx_platform_form_submissions_form_slug ON platform_form_submissions(form_slug);
CREATE INDEX idx_platform_form_submissions_created_at ON platform_form_submissions(created_at DESC);
```
