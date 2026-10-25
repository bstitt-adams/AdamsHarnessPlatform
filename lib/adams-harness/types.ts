import { z } from "zod";
import { Timestamp } from "firebase/firestore";
import type { InterviewAttachmentAnalysis } from "./attachment-analyzer";

const trimmedString = (max: number) => z.string().trim().min(1).max(max);
const nullableString = (max: number) => z.string().trim().min(1).max(max).nullable().catch(null);
const stringList = (maxItems: number, maxLen: number) =>
  z.array(z.string().trim().min(1).max(maxLen)).max(maxItems).default([]);

export const departmentInputSchema = z.strictObject({
  name: trimmedString(200),
  code: trimmedString(20),
  description: z.string().trim().max(2000).default(""),
  ownerIds: stringList(50, 200),
  memberIds: stringList(200, 200),
  isActive: z.boolean().default(true),
});

export const departmentPatchSchema = z.strictObject({
  name: trimmedString(200).optional(),
  code: trimmedString(20).optional(),
  description: z.string().trim().max(2000).optional(),
  ownerIds: stringList(50, 200).optional(),
  memberIds: stringList(200, 200).optional(),
  isActive: z.boolean().optional(),
});

export type DepartmentInput = z.infer<typeof departmentInputSchema>;
export type DepartmentPatch = z.infer<typeof departmentPatchSchema>;

export interface DepartmentDoc {
  id: string;
  name: string;
  code: string;
  description: string;
  ownerIds: string[];
  memberIds: string[];
  isActive: boolean;
  createdByUid: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export const interviewStatusSchema = z.enum([
  "draft",
  "interviewing",
  "ready_for_review",
  "completed",
]);
export type InterviewStatus = z.infer<typeof interviewStatusSchema>;

export const REQUIRED_COVERAGE_KEYS = [
  "department",
  "task",
  "trigger",
  "currentSteps",
  "actors",
  "systems",
  "painPoints",
  "desiredProcess",
  "notifications",
  "completionEvidence",
  "timingEscalation",
  "exceptions",
  "compliance",
  "integrations",
  "humanApprovals",
] as const;

export type CoverageKey = (typeof REQUIRED_COVERAGE_KEYS)[number];

export const coverageSchema = z
  .record(z.string(), z.boolean())
  .transform((record): Record<string, boolean> => {
    const normalized: Record<string, boolean> = {};
    for (const key of REQUIRED_COVERAGE_KEYS) {
      normalized[key] = record[key] === true;
    }
    return normalized;
  });

export const interviewFactsSchema = z.strictObject({
  task: nullableString(2000),
  trigger: nullableString(2000),
  frequency: nullableString(500),
  currentSteps: stringList(100, 1000),
  actors: stringList(100, 300),
  systems: stringList(100, 300),
  copiedData: stringList(100, 500),
  painPoints: stringList(100, 1000),
  desiredProcess: nullableString(5000),
  notifications: stringList(100, 500),
  completionEvidence: stringList(100, 500),
  timingEscalation: nullableString(2000),
  exceptions: stringList(100, 1000),
  compliance: stringList(100, 500),
  integrations: stringList(100, 300),
  humanApprovals: stringList(50, 500),
});

export type InterviewFacts = z.infer<typeof interviewFactsSchema>;

export const interviewMessageSchema = z.strictObject({
  id: trimmedString(100),
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(10_000),
  createdAt: z.string().min(1).max(40),
});

export type InterviewMessage = z.infer<typeof interviewMessageSchema>;

export const interviewAssistantTurnSchema = z.strictObject({
  assistantMessage: z.string().min(1).max(10_000),
  facts: interviewFactsSchema.partial().default({}),
  coverage: coverageSchema.default({}),
  unresolvedQuestions: stringList(50, 1000),
  readyForSpecification: z.boolean().default(false),
});

export type InterviewAssistantTurn = z.infer<typeof interviewAssistantTurnSchema>;

export const createInterviewSchema = z.strictObject({
  departmentId: trimmedString(200),
  title: trimmedString(300),
  task: z.string().trim().max(4000).default(""),
  respondentName: z.string().trim().min(2).max(200).optional(),
});

export const postInterviewMessageSchema = z.strictObject({
  content: z.string().min(1).max(10_000),
});

export const patchInterviewSchema = z.strictObject({
  title: trimmedString(300).optional(),
  status: z.enum(["draft", "interviewing"]).optional(),
});

export interface ProcessInterviewDoc {
  id: string;
  departmentId: string;
  title: string;
  task: string;
  status: InterviewStatus;
  createdByUid: string;
  createdByTeamMemberId?: string;
  createdByName?: string;
  /** Display name of the person providing the requirements. */
  respondentName?: string;
  messages: InterviewMessage[];
  facts: InterviewFacts;
  coverage: Record<string, boolean>;
  unresolvedQuestions: string[];
  readyForSpecification: boolean;
  attachments?: InterviewAttachmentAnalysis[];
  latestSpecVersion?: number;
  model?: string;
  /** "public" = created through the unauthenticated /interview flow */
  source?: "portal" | "public";
  /** Secret browser session credential for continuing a public interview. */
  publicSessionToken?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export const specificationStatusSchema = z.enum([
  "draft",
  "user_review",
  "approved",
  "changes_requested",
  "superseded",
]);
export type SpecificationStatus = z.infer<typeof specificationStatusSchema>;

export const namedItemSchema = z.strictObject({
  name: trimmedString(300),
  description: z.string().trim().max(4000).default(""),
});

export const roleResponsibilitySchema = z.strictObject({
  role: trimmedString(200),
  responsibilities: z.string().trim().max(4000).default(""),
});

export const approvalStepSchema = z.strictObject({
  step: trimmedString(300),
  approver: trimmedString(300),
  condition: z.string().trim().max(2000).default(""),
});

export const specificationSectionsSchema = z.strictObject({
  summary: z.string().trim().max(10_000).default(""),
  currentProcess: z.string().trim().max(20_000).default(""),
  futureProcess: z.string().trim().max(20_000).default(""),
  painPoints: stringList(100, 1000),
  roles: z.array(roleResponsibilitySchema).max(50).default([]),
  dataEntities: z.array(namedItemSchema).max(100).default([]),
  forms: z.array(namedItemSchema).max(100).default([]),
  notifications: z.array(namedItemSchema).max(100).default([]),
  integrations: z.array(namedItemSchema).max(100).default([]),
  approvals: z.array(approvalStepSchema).max(50).default([]),
  permissions: z.string().trim().max(10_000).default(""),
  auditRequirements: stringList(100, 1000),
  acceptanceCriteria: stringList(100, 2000),
  risks: stringList(100, 2000),
  outOfScope: stringList(100, 1000),
});

export type SpecificationSections = z.infer<typeof specificationSectionsSchema>;

export const patchSpecificationSchema = z.strictObject({
  title: trimmedString(300).optional(),
  sections: specificationSectionsSchema.partial().optional(),
  changeSummary: z.string().trim().max(2000).default("").optional(),
});

export const approveSpecificationSchema = z.strictObject({
  action: z.enum(["submit_review", "request_changes", "approve"]),
  note: z.string().trim().max(4000).default("").optional(),
  canonicalHash: z.string().regex(/^[a-f0-9]{64}$/i),
});

export interface SpecificationApproval {
  approvedByUid: string;
  approvedByName: string;
  approvedByRole: string;
  approvedAt: Timestamp;
  canonicalHash: string;
}

export interface SolutionSpecificationDoc {
  id: string;
  interviewId: string;
  departmentId: string;
  title: string;
  version: number;
  status: SpecificationStatus;
  canonicalHash: string;
  sections: SpecificationSections;
  changeSummary?: string;
  approval?: SpecificationApproval;
  latestBuildId?: string;
  createdByUid: string;
  createdByName?: string;
  model?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export const interviewPrdStatusSchema = z.enum([
  "draft",
  "in_review",
  "staged",
  "deploying",
  "deployed",
  "superseded",
  "archived",
]);
export type InterviewPrdStatus = z.infer<typeof interviewPrdStatusSchema>;

export const appRequestKindSchema = z.enum([
  "new_app",
  "existing_app_enhancement",
  "uncertain",
]);
export type AppRequestKind = z.infer<typeof appRequestKindSchema>;

export const targetAppAnalysisSchema = z.strictObject({
  slug: nullableString(120),
  name: nullableString(300),
  reason: z.string().trim().max(3000).default(""),
  confidence: z.number().min(0).max(1).default(0),
});
export type TargetAppAnalysis = z.infer<typeof targetAppAnalysisSchema>;

export const dataSharingRecommendationSchema = z.strictObject({
  appSlug: trimmedString(120),
  appName: trimmedString(300),
  direction: z.enum(["read", "write", "bidirectional"]),
  dataEntities: stringList(50, 300),
  recommendation: z.string().trim().max(4000).default(""),
  benefit: z.string().trim().max(2000).default(""),
});
export type DataSharingRecommendation = z.infer<typeof dataSharingRecommendationSchema>;

export const interviewPrdSectionsSchema = z.strictObject({
  overview: z.string().trim().max(10_000).default(""),
  problemStatement: z.string().trim().max(10_000).default(""),
  goals: stringList(100, 1000),
  userStories: stringList(100, 2000),
  functionalRequirements: stringList(200, 3000),
  dataModel: z.array(namedItemSchema).max(100).default([]),
  integrations: z.array(namedItemSchema).max(100).default([]),
  permissionsSecurity: z.string().trim().max(10_000).default(""),
  analytics: stringList(100, 1000),
  acceptanceCriteria: stringList(100, 2000),
  assumptions: stringList(100, 1000),
  openQuestions: stringList(100, 1000),
  rolloutPlan: stringList(100, 1000),
});
export type InterviewPrdSections = z.infer<typeof interviewPrdSectionsSchema>;

export const interviewPrdAnalysisSchema = z.strictObject({
  title: trimmedString(300),
  executiveSummary: z.string().trim().max(10_000).default(""),
  requestKind: appRequestKindSchema.default("uncertain"),
  targetApp: targetAppAnalysisSchema.nullable().catch(null),
  classificationReason: z.string().trim().max(4000).default(""),
  dataSharingOpportunities: z.array(dataSharingRecommendationSchema).max(50).default([]),
  integrationRecommendations: z.array(namedItemSchema).max(100).default([]),
  prdMarkdown: z.string().trim().min(1).max(50_000),
  sections: interviewPrdSectionsSchema.default(() => interviewPrdSectionsSchema.parse({})),
  specificationSections: specificationSectionsSchema.default(() => specificationSectionsSchema.parse({})),
});
export type InterviewPrdAnalysis = z.infer<typeof interviewPrdAnalysisSchema>;

export const generateInterviewPrdSchema = z.strictObject({
  interviewId: trimmedString(200),
  adminContext: z.string().trim().max(10_000).default("").optional(),
});

export const regenerateInterviewPrdSchema = z.strictObject({
  instructions: z.string().trim().max(10_000).default("").optional(),
});

export const patchInterviewPrdSchema = z.strictObject({
  title: trimmedString(300).optional(),
  content: z.string().trim().min(1).max(50_000).optional(),
  adminNotes: z.string().trim().max(10_000).optional(),
  status: z.enum(["draft", "in_review", "staged", "archived"]).optional(),
});

export interface InterviewPrdDoc {
  id: string;
  interviewId: string;
  departmentId: string;
  title: string;
  version: number;
  status: InterviewPrdStatus;
  requestKind: AppRequestKind;
  targetApp?: TargetAppAnalysis | null;
  classificationReason: string;
  executiveSummary: string;
  content: string;
  sections: InterviewPrdSections;
  specificationSections: SpecificationSections;
  dataSharingOpportunities: DataSharingRecommendation[];
  integrationRecommendations: { name: string; description: string }[];
  adminNotes?: string;
  requiresRegeneration?: boolean;
  canonicalHash: string;
  specificationId?: string;
  latestBuildId?: string;
  moduleSlug?: string;
  productionUrl?: string;
  deployedAt?: Timestamp;
  createdByUid: string;
  createdByName?: string;
  model?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export const moduleBuildStatusSchema = z.enum([
  "queued",
  "generating",
  "validating",
  "preview_ready",
  "deploying",
  "deployed",
  "failed",
]);
export type ModuleBuildStatus = z.infer<typeof moduleBuildStatusSchema>;

export const moduleBuildCheckSchema = z.strictObject({
  name: z.string().min(1).max(200),
  status: z.string().min(1).max(50),
  conclusion: z.string().max(50).nullable(),
  url: z.string().url().optional(),
});
export type ModuleBuildCheck = z.infer<typeof moduleBuildCheckSchema>;

export const moduleBuildSchema = z.strictObject({
  id: z.string().min(1).max(200),
  specificationId: z.string().min(1).max(200),
  specificationVersion: z.number().int().positive(),
  specificationHash: z.string().regex(/^[a-f0-9]{64}$/i),
  interviewId: z.string().min(1).max(200),
  departmentId: z.string().min(1).max(200),
  slug: z.string().min(1).max(80),
  branch: z.string().min(1).max(200),
  baseBranch: z.string().min(1).max(200),
  status: moduleBuildStatusSchema,
  requestedByUid: z.string().min(1).max(200),
  hermesRunId: z.string().max(200).optional(),
  headSha: z.string().max(64).optional(),
  pullRequestNumber: z.number().int().positive().optional(),
  pullRequestUrl: z.string().url().optional(),
  previewUrl: z.string().url().optional(),
  productionUrl: z.string().url().optional(),
  mergeCommitSha: z.string().max(64).optional(),
  changedFiles: z.array(z.string().max(500)).max(200).default([]),
  checks: z.array(moduleBuildCheckSchema).max(100).default([]),
  failureReason: z.string().max(2000).optional(),
  deployedSha: z.string().max(64).optional(),
});

export type ModuleBuildInput = z.infer<typeof moduleBuildSchema>;

export interface ModuleBuildDoc extends ModuleBuildInput {
  createdAt: Timestamp;
  updatedAt: Timestamp;
  deployedAt?: Timestamp;
}

export interface ModuleRecordComment {
  id: string;
  authorUid: string;
  authorName: string;
  content: string;
  createdAt: string;
}

export interface ModuleRecordDoc {
  id: string;
  moduleSlug: string;
  recordTypeId: string;
  formId?: string;
  departmentId: string;
  data: Record<string, string | number | boolean | null>;
  extendedData?: Record<string, string | number | boolean | null>;
  notes?: string;
  tags?: string[];
  comments?: ModuleRecordComment[];
  status: "active" | "completed" | "archived";
  assignedToUid?: string;
  assignedToTeamMemberId?: string;
  dueAt?: Timestamp;
  completedAt?: Timestamp;
  evidencePaths: string[];
  sourceRecordId?: string;
  version: number;
  lastMutationKey?: string;
  lastMutationByUid?: string;
  createdByUid: string;
  createdByTeamMemberId?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ModuleChartConfig {
  id: string;
  title: string;
  description?: string;
  chartType: "bar" | "line" | "pie" | "area";
  groupByField: string;
  metric: "count" | "sum" | "avg";
  valueField?: string;
  aiRecommended?: boolean;
  promptUsed?: string;
}

export interface ModuleCustomMetric {
  id: string;
  label: string;
  description?: string;
  aggregation: "count" | "completed_rate" | "overdue_count" | "active_count" | "field_sum";
  fieldId?: string;
  filterStatus?: "active" | "completed" | "archived";
  promptUsed?: string;
}

export interface ModuleTriggerRule {
  id: string;
  name: string;
  enabled: boolean;
  event: "record_created" | "record_updated" | "status_completed" | "overdue";
  conditionField?: string;
  conditionOperator?: "equals" | "contains" | "not_empty";
  conditionValue?: string;
  actionType: "in_app_notification" | "telegram_notification" | "teams_notification" | "webhook" | "auto_assign" | "mark_completed";
  targetRecipient?: string;
  messageTemplate: string;
  webhookUrl?: string;
  createdByAiPrompt?: string;
}

export interface ModuleApiEndpointConfig {
  id: string;
  name: string;
  slug: string;
  enabled: boolean;
  methods: ("GET" | "POST" | "PATCH")[];
  apiKey: string;
  exposedFields: string[];
  createdAt: string;
}

export interface ModuleAppSettingsDoc {
  slug: string;
  visibleColumns: string[];
  customMetrics: ModuleCustomMetric[];
  charts: ModuleChartConfig[];
  triggers: ModuleTriggerRule[];
  apiEndpoints: ModuleApiEndpointConfig[];
  detailFields: { id: string; label: string; type: "text" | "textarea" | "number" | "date" }[];
  updatedAt?: Timestamp;
  updatedByUid?: string;
}

export interface ModuleNotificationDoc {
  id: string;
  departmentId: string;
  moduleSlug: string;
  recordId?: string;
  recipientUid?: string;
  recipientTeamMemberId?: string;
  type: "assignment" | "reminder" | "escalation" | "completion";
  title: string;
  message: string;
  read: boolean;
  createdAt: Timestamp;
}

export interface ModuleUploadDoc {
  id: string;
  departmentId: string;
  moduleSlug: string;
  fieldId: string;
  storagePath: string;
  originalName: string;
  contentType: string;
  size: number;
  ownerUid: string;
  createdAt: Timestamp;
}

export interface ModuleScheduleRunDoc {
  id: string;
  moduleSlug: string;
  workflowId: string;
  status: "queued" | "running" | "completed" | "failed";
  detail?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export const gbrainPageTypeSchema = z.enum([
  "sop",
  "faq",
  "entity",
  "module_reference",
  "document",
]);
export type GBrainPageType = z.infer<typeof gbrainPageTypeSchema>;

export interface GBrainRepoConfig {
  enabled?: boolean;
  githubRepo?: string; // e.g. "bstitt-adams/AdamsGBrain"
  branch?: string; // default "main"
  basePath?: string; // default "brain"
  hermesWorkspacePath?: string;
  apiKey?: string;
  lastSyncedAt?: string;
  hermesSyncStatus?: "synced" | "pending" | "error";
  hermesLastSyncedAt?: string;
  hermesSyncedPagesCount?: number;
  hermesSyncedChunksCount?: number;
  telegramEnabled?: boolean;
  teamsEnabled?: boolean;
}

export interface BrainDoc {
  id: string;
  name: string;
  description: string;
  departmentId: string;
  ownerIds: string[];
  audience: "department" | "admins";
  isActive: boolean;
  gbrainRepo?: GBrainRepoConfig;
  createdByUid: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export const brainSourceTypeSchema = z.enum(["upload", "platform", "gbrain_page"]);
export const brainConnectorSchema = z.enum([
  "approved_specifications",
  "site_calendars",
  "module_definitions",
  "module_records",
  "user_assets",
  "user_training_certs",
  "command_control_projects",
  "system_docs",
]);
export type BrainConnector = z.infer<typeof brainConnectorSchema>;
export const brainSourceStatusSchema = z.enum([
  "processing",
  "ready",
  "failed",
  "retired",
]);

export interface BrainSourceDoc {
  id: string;
  brainId: string;
  departmentId: string;
  type: z.infer<typeof brainSourceTypeSchema>;
  connector?: BrainConnector;
  pageType?: GBrainPageType;
  slug?: string;
  tags?: string[];
  compiledTruth?: string;
  timelineNotes?: string;
  markdownContent?: string;
  title: string;
  logicalKey: string;
  version: number;
  status: z.infer<typeof brainSourceStatusSchema>;
  checksum: string;
  storagePath?: string;
  contentType?: string;
  originalName?: string;
  textLength: number;
  chunkCount: number;
  refreshedAt?: Timestamp;
  createdByUid: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  failureReason?: string;
}

export interface BrainChunkDoc {
  id: string;
  brainId: string;
  sourceId: string;
  departmentId: string;
  ordinal: number;
  sourceTitle: string;
  text: string;
  normalizedTerms: string[];
  createdAt: Timestamp;
}

export interface BrainQueryDoc {
  id: string;
  brainId: string;
  departmentId: string;
  actorUid: string;
  question: string;
  answer: string;
  citationIds: string[];
  model?: string;
  createdAt: Timestamp;
}

export const gbrainRepoConfigSchema = z
  .object({
    enabled: z.boolean().optional(),
    githubRepo: z.string().trim().max(300).optional(),
    branch: z.string().trim().max(100).optional(),
    basePath: z.string().trim().max(200).optional(),
    hermesWorkspacePath: z.string().trim().max(500).optional(),
    apiKey: z.string().trim().max(200).optional(),
    lastSyncedAt: z.string().max(100).optional(),
  })
  .optional();

export const brainInputSchema = z.strictObject({
  name: trimmedString(200),
  description: z.string().trim().max(2000).default(""),
  departmentId: trimmedString(200),
  ownerIds: stringList(50, 200),
  audience: z.enum(["department", "admins"]),
  isActive: z.boolean().default(true),
  gbrainRepo: gbrainRepoConfigSchema,
});

export const brainPatchSchema = z.strictObject({
  name: trimmedString(200).optional(),
  description: z.string().trim().max(2000).optional(),
  ownerIds: stringList(50, 200).optional(),
  audience: z.enum(["department", "admins"]).optional(),
  isActive: z.boolean().optional(),
  gbrainRepo: gbrainRepoConfigSchema,
});

export const brainQueryInputSchema = z.strictObject({
  question: z.string().trim().min(1).max(4000),
});

export const brainSourcePatchSchema = z.strictObject({
  status: z.enum(["retired", "ready"]),
});

export interface AdamsAuditLogDoc {
  id: string;
  entityType:
    | "department"
    | "interview"
    | "interview_prd"
    | "specification"
    | "module_build"
    | "module_record"
    | "brain"
    | "brain_source"
    | "brain_query";
  entityId: string;
  action: string;
  actorUid: string;
  actorName: string;
  actorRole: string;
  detail?: Record<string, string | number | boolean | null>;
  createdAt: Timestamp;
}
