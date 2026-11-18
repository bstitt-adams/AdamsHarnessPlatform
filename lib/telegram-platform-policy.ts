import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";

const text = z.string().trim().min(1).max(2000);
const title = z.string().trim().min(1).max(200);
const date = z.iso.date();
const id = z.string().regex(/^[A-Za-z0-9_-]{1,200}$/);
const scalar = z.union([z.string().max(5000), z.number().finite(), z.boolean(), z.null()]);

export type PlatformModule = {
  dynamicModule?: boolean;
  label: string;
  path: string;
  collection?: string;
  fields: string[];
  personal?: Record<string, "uid" | "member" | "email">;
  create?: z.ZodType;
  update?: z.ZodType;
  unavailable?: string;
};

const taskCreate = z.strictObject({ description: text, priority: z.enum(["low", "medium", "high"]).default("medium"), dueDate: date.optional() });
const taskUpdate = z.strictObject({ description: text.optional(), priority: z.enum(["low", "medium", "high"]).optional(), completed: z.boolean().optional() });
const orderCreate = z.strictObject({ itemSummary: title, jobsite: title, vendor: z.string().max(200).default(""), quantity: z.number().int().min(1).max(100000).default(1), expectedDeliveryDate: date.optional(), notes: z.string().max(2000).default("") });
const orderUpdate = z.strictObject({ itemSummary: title.optional(), jobsite: title.optional(), vendor: z.string().max(200).optional(), quantity: z.number().int().min(1).max(100000).optional(), expectedDeliveryDate: date.optional(), notes: z.string().max(2000).optional() });
const ideaCreate = z.strictObject({ title, description: text, category: title.default("Process Automation"), impactSummary: z.string().max(2000).default("") });
const ideaUpdate = z.strictObject({ title: title.optional(), description: text.optional(), category: title.optional(), impactSummary: z.string().max(2000).optional(), status: z.enum(["submitted", "under_review", "approved", "implemented"]).optional() });

export const platformModules: Record<string, PlatformModule> = {
  "my-tasks": { label: "My Tasks", path: "/portal/my-tasks", collection: "tractionTodos", personal: { ownerId: "member", ownerEmail: "email" }, fields: ["description", "status", "priority", "completed", "dueDate", "ownerId"], create: taskCreate, update: taskUpdate },
  "my-assets": { label: "My Assets", path: "/portal/my-assets", collection: "userAssets", personal: { assignedToTeamMemberId: "member", assignedToUid: "uid" }, fields: ["assetName", "assetType", "serialNumber", "assetTag", "status", "assignedAt"] },
  "my-training": { label: "My Training and Certs", path: "/portal/my-training", collection: "userTrainingCerts", personal: { teamMemberId: "member", userId: "uid" }, fields: ["trainingTitle", "trainingCategory", "issuingOrganization", "completionDate", "expirationDate", "trainingHours"] },
  "my-orders": { label: "My Orders", path: "/portal/my-orders", collection: "userOrders", personal: { requesterTeamMemberId: "member", requesterUid: "uid", requesterEmail: "email" }, fields: ["orderNumber", "itemSummary", "jobsite", "vendor", "quantity", "status", "expectedDeliveryDate", "notes"], create: orderCreate, update: orderUpdate },
  "my-ideas": { label: "My Ideas", path: "/portal/my-ideas", collection: "userIdeas", personal: { authorTeamMemberId: "member", authorUid: "uid", authorEmail: "email" }, fields: ["title", "description", "category", "impactSummary", "status"], create: ideaCreate, update: ideaUpdate },
  "bug-tracker": { label: "Bug Tracker", path: "/portal/bug-tracker", collection: "bugTrackerItems", fields: ["title", "description", "status", "priority", "type", "page", "reporterName", "assigneeName"], update: z.strictObject({ title: title.optional(), description: text.optional() }) },
  "system-docs": { label: "System Documentation", path: "/portal/system-docs", fields: [], unavailable: "This page is static system documentation, not a collection of editable records. Open the platform link for its current content." },
  "command-control": { label: "Command Control", path: "/portal/opportunities", collection: "opportunities", fields: ["name", "title", "description", "stage", "status", "value", "expectedCloseDate"] },
  projects: { label: "Projects", path: "/portal/projects", collection: "projects", fields: ["name", "description", "status", "startDate", "endDate", "progress"] },
  calendar: { label: "Adams Master Calendar", path: "/portal/calendar", collection: "calendarEvents", fields: ["title", "description", "startDate", "endDate", "allDay", "type", "location"], create: z.strictObject({ title, description: z.string().max(2000).default(""), startDate: z.iso.datetime({ offset: true }), endDate: z.iso.datetime({ offset: true }), allDay: z.boolean().default(false), location: z.string().max(200).default("") }).refine((v) => Date.parse(v.endDate) >= Date.parse(v.startDate), "End must not precede start"), update: z.strictObject({ title: title.optional(), description: z.string().max(2000).optional(), location: z.string().max(200).optional() }) },
  proposals: { label: "Proposal Creator", path: "/portal/proposals", collection: "proposals", fields: ["name", "description", "type", "status", "fundingSource", "totalBudget", "startDate", "endDate"] },
  forms: { label: "AI Form Builder", path: "/portal/form-builder", collection: "platformForms", fields: ["name", "title", "description", "status", "slug"] },
  "team-members": { label: "Team Members", path: "/portal/admin/team-members", collection: "teamMembers", fields: ["firstName", "lastName", "title", "status", "workforceDepartmentName", "businessUnitNames"] },
  documents: { label: "Documents", path: "/portal/documents", collection: "platformDocuments", fields: ["title", "name", "description", "category", "status"] },
  images: { label: "Image Manager", path: "/portal/admin/images", collection: "images", fields: ["name", "title", "alt", "category", "tags"] },
  academy: { label: "Academy / Adams Learning Academy", path: "/academy", collection: "lms_courses", fields: ["title", "description", "status", "instructorName", "difficultyLevel", "isFree", "priceInCents"] },
  "academy-admin": { label: "Academy Admin", path: "/portal/admin/academy", collection: "lms_enrollments", fields: ["courseId", "userId", "teamMemberId", "enrolledAt", "progressPercentage", "completedAt"] },
  navigation: { label: "Navigation Manager", path: "/portal/admin/navigation", collection: "navigation_header", fields: ["label", "title", "href", "order", "isVisible"] },
  backups: { label: "Backup & Restore", path: "/portal/admin/backups", collection: "backupMetadata", fields: ["name", "status", "createdAt", "size", "type"] },
  solutions: { label: "Solutions", path: "/portal/solutions", collection: "solutionSpecifications", fields: ["title", "name", "summary", "status", "departmentId"] },
  modules: { label: "Modules", path: "/portal/modules", collection: "moduleBuilds", fields: ["name", "title", "moduleSlug", "status", "departmentId"] },
  "module-records": { label: "Generated Module Records", path: "/portal/modules", collection: "moduleRecords", fields: ["moduleSlug", "recordTypeId", "status", "tags", "dueAt", "version"], dynamicModule: true },
  "module-alerts": { label: "Module Alerts", path: "/portal/module-notifications", collection: "moduleNotifications", fields: ["title", "message", "moduleSlug", "status", "createdAt"] },
  adamsbrain: { label: "AdamsBrain", path: "/portal/adams-brain", collection: "adamsBrains", fields: ["name", "description", "departmentId", "status"] },
  "ai-workforce": { label: "AI Workforce", path: "/portal/ai-workforce", collection: "aiEmployees", fields: ["name", "title", "role", "description", "isActive"] },
  "safety-calendar": { label: "Safety Calendar", path: "/safety-calendar", collection: "siteCalendarItems", fields: ["siteId", "title", "description", "date", "time", "location", "assignee"] },
  certifications: { label: "Certification Tracker", path: "/portal/admin/certification-tracker", collection: "userTrainingCerts", fields: ["userName", "teamMemberId", "trainingTitle", "issuingOrganization", "completionDate", "expirationDate", "trainingHours"] },
  "vehicle-inspections": { label: "Vehicle Inspection", path: "/portal/vehicle-inspection", collection: "vehicleInspections", fields: ["vehicleId", "vehicleNumber", "inspectionDate", "status", "outOfService", "odometer"] },
  "safety-requests": { label: "Safety Request Box", path: "/portal/safety-request-box", collection: "safetyRequests", fields: ["type", "title", "description", "jobsite", "anonymous", "status", "priority", "triageNotes"], create: z.strictObject({ type: z.enum(["request", "observation", "near_miss", "hazard"]), title, description: text, jobsite: z.string().max(200).default(""), anonymous: z.boolean().default(false) }), update: z.strictObject({ priority: z.enum(["low", "normal", "high", "urgent"]).optional(), triageNotes: z.string().max(2000).optional(), status: z.enum(["open", "triaged", "in_progress", "resolved", "closed"]).optional() }) },
  "order-tracking": { label: "Order Tracking", path: "/portal/order-tracking", fields: [], unavailable: "Order Tracking is a Coming Soon page. Use My Orders for existing persisted material requests; this is not a live procurement integration." },
  mindchuk: { label: "MindChuk Clone", path: "/portal/mindchuk-clone", collection: "tractionTodos", personal: { ownerId: "member", ownerEmail: "email" }, fields: ["description", "status", "priority", "completed", "dueDate", "mindchukKind"], create: taskCreate, update: taskUpdate },
};

export const telegramUpdateSchema = z.object({
  update_id: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  message: z.object({
    from: z.object({ id: z.number().int().positive().max(Number.MAX_SAFE_INTEGER), username: z.string().max(64).optional(), first_name: z.string().max(256).optional(), last_name: z.string().max(256).optional() }).optional(),
    chat: z.object({ id: z.number().int().min(-Number.MAX_SAFE_INTEGER).max(Number.MAX_SAFE_INTEGER), username: z.string().max(64).optional(), type: z.string().max(32).optional() }),
    text: z.string().max(4096).optional(),
  }).optional(),
});

export const platformIntentSchema = z.strictObject({
  action: z.enum(["help", "read", "create", "update", "clarify"]),
  module: z.string().max(60).optional(),
  recordId: id.optional(),
  search: z.string().max(200).optional(),
  afterId: id.optional(),
  data: z.record(z.string(), scalar).optional(),
  reply: z.string().max(1500).optional(),
});
export type PlatformIntent = z.infer<typeof platformIntentSchema>;
export type PlatformIdentity = { uid: string; memberId?: string; email: string };

export function validWebhookSecret(expected: string | undefined, supplied: string | null): boolean {
  if (!expected || !supplied) return false;
  const hash = (v: string) => createHash("sha256").update(v).digest();
  return timingSafeEqual(hash(expected), hash(supplied));
}

export function getPlatformModule(key: string | undefined): PlatformModule {
  const module = key && Object.hasOwn(platformModules, key) ? platformModules[key] : undefined;
  if (!module) throw new Error("Choose a module using /modules.");
  return module;
}

export function ownsPlatformRecord(module: PlatformModule, row: Record<string, unknown>, actor: PlatformIdentity): boolean {
  if (!module.personal) return true;
  return Object.entries(module.personal).some(([field, type]) => {
    const value = type === "uid" ? actor.uid : type === "member" ? actor.memberId : actor.email;
    return Boolean(value) && row[field] === value;
  }) || (module.collection === "tractionTodos" && row.ownerId === actor.uid);
}

export function projectPlatformRecord(module: PlatformModule, row: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const field of module.fields) {
    const value = row[field];
    if (typeof value === "string") result[field] = value.slice(0, 800);
    else if (value === null || typeof value === "boolean" || (typeof value === "number" && Number.isFinite(value))) result[field] = value;
    else if (Array.isArray(value)) result[field] = value.filter((v) => typeof v === "string").slice(0, 15).map((v) => v.slice(0, 100));
    else if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") result[field] = value.toDate().toISOString();
  }
  return result;
}

export function validatePlatformWrite(intent: PlatformIntent): Record<string, unknown> {
  const module = getPlatformModule(intent.module);
  if (intent.action !== "create" && intent.action !== "update") throw new Error("Not a write operation.");
  if (module.dynamicModule) {
    const data = intent.data || {};
    if (typeof data.moduleSlug !== "string" || !/^[a-z0-9][a-z0-9-]{0,58}$/.test(data.moduleSlug)) {
      throw new Error("Generated-module writes need data.moduleSlug (the module's slug).");
    }
    if (intent.action === "create" && (typeof data.formId !== "string" || !/^[a-z][a-z0-9_]{0,58}$/.test(data.formId))) {
      throw new Error("Generated-module creates need data.formId (the form's id). Ask to list the module's forms first.");
    }
    const meta = intent.action === "create" ? ["moduleSlug", "formId"] : ["moduleSlug", "status"];
    if (data.status !== undefined && !["active", "completed", "archived"].includes(String(data.status))) {
      throw new Error("data.status must be active, completed, or archived.");
    }
    const fields = Object.keys(data).filter((k) => !meta.includes(k));
    if (!fields.length && intent.action === "create") throw new Error("No field values provided.");
    return data;
  }
  const schema = module[intent.action];
  if (!schema) throw new Error(`${module.label} changes are not available in Telegram yet. Use ${module.path}.`);
  if (intent.action === "update" && !intent.recordId) throw new Error("An exact record ID is required. Ask to list records first.");
  const result = schema.safeParse(intent.data ?? {});
  if (!result.success) throw new Error(`Required or allowed fields: ${result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ").slice(0, 1200)}`);
  const data = result.data as Record<string, unknown>;
  if (!Object.keys(data).length) throw new Error("No changes provided.");
  return data;
}
