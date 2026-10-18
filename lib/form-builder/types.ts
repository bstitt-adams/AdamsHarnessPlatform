import type { Timestamp } from "firebase/firestore";

export type FormControlType =
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

export type PlatformLookupSource =
  | "team_members"
  | "departments"
  | "projects"
  | "opportunities"
  | "safety_sites"
  | "user_assets"
  | "lms_courses"
  | "manual_list";

export interface DocumentOverlayPosition {
  page: number;
  xPercent: number; // 0..100
  yPercent: number; // 0..100
  widthPercent: number; // 10..90
}

export interface FormConditionalRule {
  sourceFieldId: string;
  operator: "equals" | "not_equals" | "contains" | "greater_than";
  value: string;
  action: "show" | "hide" | "require";
}

export interface FormFieldDefinition {
  id: string;
  key: string;
  label: string;
  type: FormControlType;
  placeholder?: string;
  helpText?: string;
  required: boolean;
  section?: string;
  /** Manual dropdown/radio/multi-select options */
  options?: string[];
  /** Platform lookup source for dynamic dropdowns */
  lookupSource?: PlatformLookupSource;
  /** Scale configuration for Likert / Rating / NPS */
  scaleMin?: number;
  scaleMax?: number;
  scaleMinLabel?: string;
  scaleMaxLabel?: string;
  /** Columns for repeating_table */
  tableColumns?: string[];
  /** Formula expression for calculated field, e.g. "{quantity} * {unit_cost}" */
  formula?: string;
  /** Conditional visibility / requirement rule */
  conditionalRule?: FormConditionalRule;
  /** Position on imported PDF/Word document canvas */
  overlayPosition?: DocumentOverlayPosition;
  /** Data Analyst metadata for reporting */
  reportingCategory?: "dimension" | "metric" | "identifier" | "open_text" | "compliance_artifact";
  recommendedChartType?: "bar" | "pie" | "line" | "kpi" | "none";
  aiBestPracticeNote?: string;
}

export type FormPresentationMode =
  | "standard" // Multi-section Jotform / Formstack / Cognito style
  | "conversational" // One-question-at-a-time Typeform / Tally style
  | "document_overlay"; // AirSlate / PDF & Word Document overlay style

export interface ImportedDocumentTemplate {
  fileName: string;
  fileType: "pdf" | "word";
  extractedText: string;
  base64DataUri?: string;
  pageCount: number;
  importedAt: string;
}

export interface FormIntegrationTarget {
  id: string;
  type:
    | "platform_module_records"
    | "platform_my_tasks"
    | "platform_my_orders"
    | "platform_my_training"
    | "platform_opportunities"
    | "platform_master_calendar"
    | "platform_adams_brain"
    | "telegram_alert"
    | "teams_alert"
    | "outbound_webhook"
    | "rest_api"
    | "procore"
    | "servicetitan"
    | "autodesk_acc"
    | "sharepoint"
    | "airslate_docusign"
    | "quickbooks";
  name: string;
  enabled: boolean;
  targetSlugOrUrl?: string;
  fieldMapping?: Record<string, string>;
}

export interface PdfGenerationConfig {
  enabled: boolean;
  headerTitle: string;
  headerSubtitle: string;
  includeLogo: boolean;
  includeSignatureBlock: boolean;
  includeTimestampAndAuditHash: boolean;
  footerText: string;
}

export interface FormDropOffStepStat {
  fieldId: string;
  fieldLabel: string;
  reachedCount: number;
  completedCount: number;
  abandonedCount: number;
  avgTimeSpentSeconds: number;
}

export interface FormAnalyticsSummary {
  totalViews: number;
  totalStarts: number;
  totalSubmissions: number;
  completionRatePct: number;
  avgCompletionSeconds: number;
  stepStats: FormDropOffStepStat[];
}

export interface PlatformFormDoc {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  departmentId: string;
  status: "draft" | "published" | "archived";
  presentationMode: FormPresentationMode;
  fields: FormFieldDefinition[];
  importedDocument?: ImportedDocumentTemplate;
  integrations: FormIntegrationTarget[];
  pdfConfig: PdfGenerationConfig;
  apiKey: string;
  analytics: FormAnalyticsSummary;
  createdByUid: string;
  createdByName: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface PlatformFormSubmissionDoc {
  id: string;
  formId: string;
  formSlug: string;
  formTitle: string;
  submittedByUid?: string;
  submittedByName: string;
  submittedByEmail?: string;
  values: Record<string, unknown>;
  signatureDataUri?: string;
  signatureSignedBy?: string;
  signatureSignedAt?: string;
  attachments?: {
    fieldKey: string;
    fileName: string;
    mimeType: string;
    base64: string;
  }[];
  completionSeconds: number;
  source: "portal" | "public_link" | "api";
  createdAt: Timestamp;
}
