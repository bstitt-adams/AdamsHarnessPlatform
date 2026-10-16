import type { ModuleDefinition, ModuleField, ModuleRecordType, ModuleForm } from "@/lib/modules/contract";
import { COLLECTIONS } from "@/lib/schema";
import { getDb } from "@/lib/adams-harness/server-store";
import type {
  ProcessInterviewDoc,
  SolutionSpecificationDoc,
  ModuleAppSettingsDoc,
} from "@/lib/adams-harness/types";

export const BUILTIN_MODULES: ModuleDefinition[] = [
  {
    schemaVersion: 1,
    slug: "safety-request-inbox",
    name: "Safety Request Inbox",
    description:
      "Capture safety superintendent requests, assign owners, track due dates, and notify requesters when resolved.",
    departmentId: "safety",
    icon: "inbox",
    recordTypes: [
      {
        id: "safety_request",
        label: "Safety Request",
        fields: [
          { id: "title", label: "Request Title", type: "text", required: true },
          {
            id: "category",
            label: "Category",
            type: "select",
            required: true,
            options: ["PPE", "Signage", "Equipment Inspection", "Hazard Report", "Training", "Other"],
          },
          {
            id: "priority",
            label: "Priority",
            type: "select",
            required: true,
            options: ["Low", "Medium", "High", "Critical"],
          },
          { id: "jobsite", label: "Jobsite / Location", type: "text", required: true },
          { id: "requester_name", label: "Requester", type: "text", required: true },
          { id: "assigned_owner", label: "Assigned Owner", type: "text", required: false },
          { id: "due_date", label: "Due Date", type: "date", required: false },
          { id: "estimated_cost", label: "Estimated Cost ($)", type: "number", required: false, min: 0 },
          { id: "details", label: "Request Details", type: "textarea", required: false },
        ],
      },
    ],
    forms: [
      {
        id: "submit_safety_request",
        title: "New Safety Request",
        description: "Submit a new safety request for jobsite crews.",
        recordTypeId: "safety_request",
        fields: [
          "title",
          "category",
          "priority",
          "jobsite",
          "requester_name",
          "assigned_owner",
          "due_date",
          "estimated_cost",
          "details",
        ],
        submitLabel: "Submit Safety Request",
      },
    ],
    workflows: [],
    dashboards: [
      { type: "count", recordTypeId: "safety_request", label: "Total Requests" },
      { type: "status_breakdown", recordTypeId: "safety_request", label: "Requests by Status" },
      { type: "due_list", recordTypeId: "safety_request", label: "Upcoming Due Dates", limit: 5 },
    ],
  },
  {
    schemaVersion: 1,
    slug: "vehicle-inspection-tracker",
    name: "Six-Month Vehicle Inspection",
    description:
      "Recurring fleet inspections with VIN/plate tracking, defect reporting, and supervisor escalation.",
    departmentId: "safety",
    icon: "truck",
    recordTypes: [
      {
        id: "vehicle_inspection",
        label: "Vehicle Inspection",
        fields: [
          { id: "vehicle_number", label: "Vehicle / Unit #", type: "text", required: true },
          { id: "driver_name", label: "Assigned Driver", type: "text", required: true },
          { id: "vin", label: "VIN / License Plate", type: "text", required: true },
          { id: "mileage", label: "Current Mileage", type: "number", required: true, min: 0 },
          {
            id: "condition",
            label: "Overall Condition",
            type: "select",
            required: true,
            options: ["Pass", "Needs Maintenance", "Out of Service"],
          },
          { id: "next_due_date", label: "Next Inspection Due Date", type: "date", required: true },
          { id: "inspector_notes", label: "Inspection Notes", type: "textarea", required: false },
        ],
      },
    ],
    forms: [
      {
        id: "log_vehicle_inspection",
        title: "Log Vehicle Inspection",
        description: "Record a six-month vehicle safety inspection.",
        recordTypeId: "vehicle_inspection",
        fields: [
          "vehicle_number",
          "driver_name",
          "vin",
          "mileage",
          "condition",
          "next_due_date",
          "inspector_notes",
        ],
        submitLabel: "Save Inspection",
      },
    ],
    workflows: [],
    dashboards: [
      { type: "count", recordTypeId: "vehicle_inspection", label: "Total Inspections" },
      { type: "status_breakdown", recordTypeId: "vehicle_inspection", label: "Inspection Status" },
      { type: "due_list", recordTypeId: "vehicle_inspection", label: "Upcoming Inspections", limit: 5 },
    ],
  },
];

function sanitizeId(input: string, fallback: string): string {
  const cleaned = input
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^[^a-z]+/, "")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 50);
  return cleaned || fallback;
}

export function slugifySolutionTitle(title: string, idSuffix?: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 45);
  const suffix = idSuffix ? `-${idSuffix.slice(0, 6).toLowerCase()}` : "";
  return `${base || "solution-app"}${suffix}`;
}

export function buildModuleDefinitionFromInterviewOrSpec(
  interview: ProcessInterviewDoc,
  spec?: SolutionSpecificationDoc | null,
): ModuleDefinition {
  const slug = slugifySolutionTitle(spec?.title || interview.title, interview.id);
  const recordTypeId = "solution_item";

  const baseFields: ModuleField[] = [
    { id: "title", label: "Item Title", type: "text", required: true },
    {
      id: "category",
      label: "Category",
      type: "select",
      required: true,
      options: ["General", "Operations", "Safety", "Escalation", "Compliance"],
    },
    {
      id: "priority",
      label: "Priority",
      type: "select",
      required: true,
      options: ["Low", "Medium", "High", "Critical"],
    },
    { id: "assigned_owner", label: "Assigned Owner", type: "text", required: false },
    { id: "due_date", label: "Due Date", type: "date", required: false },
    { id: "metric_value", label: "Metric / Value", type: "number", required: false },
    { id: "summary", label: "Summary", type: "textarea", required: false },
  ];

  if (spec?.sections?.dataEntities?.length) {
    for (const entity of spec.sections.dataEntities.slice(0, 4)) {
      const fieldId = sanitizeId(entity.name, "");
      if (fieldId && !baseFields.some((f) => f.id === fieldId)) {
        baseFields.push({
          id: fieldId,
          label: entity.name,
          type: "text",
          required: false,
          helpText: entity.description || undefined,
        });
      }
    }
  }

  const recordType: ModuleRecordType = {
    id: recordTypeId,
    label: spec?.title || interview.title,
    fields: baseFields,
  };

  const form: ModuleForm = {
    id: "create_item",
    title: `New ${spec?.title || interview.title} Item`,
    description:
      spec?.sections?.summary ||
      interview.facts?.desiredProcess ||
      interview.task ||
      "Create and track items for this solution.",
    recordTypeId,
    fields: baseFields.map((f) => f.id),
    submitLabel: "Create Item",
  };

  return {
    schemaVersion: 1,
    slug,
    name: spec?.title || interview.title,
    description:
      spec?.sections?.summary ||
      interview.facts?.desiredProcess ||
      interview.task ||
      `Solution workspace for ${interview.title}`,
    departmentId: interview.departmentId || "safety",
    icon: "sparkles",
    recordTypes: [recordType],
    forms: [form],
    workflows: [],
    dashboards: [
      { type: "count", recordTypeId, label: "Total Items" },
      { type: "status_breakdown", recordTypeId, label: "Status Breakdown" },
      { type: "due_list", recordTypeId, label: "Upcoming Due Items", limit: 5 },
    ],
  };
}

export async function listAllAvailableModules(): Promise<
  (ModuleDefinition & { interviewId?: string; specificationId?: string })[]
> {
  const map = new Map<
    string,
    ModuleDefinition & { interviewId?: string; specificationId?: string }
  >();
  for (const mod of BUILTIN_MODULES) {
    map.set(mod.slug, mod);
  }

  try {
    const db = getDb();
    const [interviewsSnap, specsSnap] = await Promise.all([
      db.collection(COLLECTIONS.PROCESS_INTERVIEWS).get(),
      db.collection(COLLECTIONS.SOLUTION_SPECIFICATIONS).get(),
    ]);

    const specsByInterview = new Map<string, SolutionSpecificationDoc>();
    for (const docSnap of specsSnap.docs) {
      const spec = { id: docSnap.id, ...docSnap.data() } as SolutionSpecificationDoc;
      const existing = specsByInterview.get(spec.interviewId);
      if (!existing || spec.version > existing.version) {
        specsByInterview.set(spec.interviewId, spec);
      }
    }

    for (const docSnap of interviewsSnap.docs) {
      const interview = { id: docSnap.id, ...docSnap.data() } as ProcessInterviewDoc;
      const spec = specsByInterview.get(interview.id);
      const derived = buildModuleDefinitionFromInterviewOrSpec(interview, spec);
      map.set(derived.slug, {
        ...derived,
        interviewId: interview.id,
        specificationId: spec?.id,
      });
    }
  } catch {
    // Return built-in modules if DB is unavailable
  }

  return Array.from(map.values());
}

export function getDefaultModuleAppSettings(def: ModuleDefinition): ModuleAppSettingsDoc {
  const primaryRecordType = def.recordTypes[0];
  const allFieldIds = primaryRecordType ? primaryRecordType.fields.map((f) => f.id) : [];
  const selectField = primaryRecordType?.fields.find((f) => f.type === "select")?.id || "status";
  const secondSelectField =
    primaryRecordType?.fields.filter((f) => f.type === "select")[1]?.id || selectField;
  const numericField = primaryRecordType?.fields.find((f) => f.type === "number")?.id;

  return {
    slug: def.slug,
    visibleColumns: allFieldIds.slice(0, 6),
    customMetrics: [
      {
        id: "total_items",
        label: "Total Items",
        description: "All records in this solution",
        aggregation: "count",
      },
      {
        id: "active_items",
        label: "Active / Open",
        description: "Items currently in progress",
        aggregation: "active_count",
      },
      {
        id: "completion_rate",
        label: "Completion Rate (%)",
        description: "Percentage of items marked completed",
        aggregation: "completed_rate",
      },
      {
        id: "overdue_items",
        label: "Overdue Items",
        description: "Active items past their due date",
        aggregation: "overdue_count",
      },
    ],
    charts: [
      {
        id: "ai_status_distribution",
        title: "Items by Status (AI Recommended)",
        description: "Distribution of active, completed, and archived items",
        chartType: "pie",
        groupByField: "status",
        metric: "count",
        aiRecommended: true,
      },
      {
        id: "ai_category_breakdown",
        title: `Items by ${selectField.replace(/_/g, " ")} (AI Recommended)`,
        description: "Volume breakdown across primary categories",
        chartType: "bar",
        groupByField: selectField,
        metric: numericField ? "sum" : "count",
        valueField: numericField,
        aiRecommended: true,
      },
      {
        id: "ai_priority_trend",
        title: `Breakdown by ${secondSelectField.replace(/_/g, " ")} (AI Recommended)`,
        description: "Operational workload distribution",
        chartType: "area",
        groupByField: secondSelectField,
        metric: "count",
        aiRecommended: true,
      },
    ],
    triggers: [
      {
        id: "default_created_alert",
        name: "Notify owner on new item",
        enabled: true,
        event: "record_created",
        actionType: "in_app_notification",
        messageTemplate: `New item created in ${def.name}: {{record.title}}`,
      },
    ],
    apiEndpoints: [],
    detailFields: [
      { id: "root_cause", label: "Root Cause / Context", type: "textarea" },
      { id: "resolution_notes", label: "Resolution & Verification Notes", type: "textarea" },
      { id: "external_reference", label: "External Reference / PO / Ticket #", type: "text" },
      { id: "verified_by", label: "Verified By", type: "text" },
    ],
  };
}

export async function getModuleAppSettings(def: ModuleDefinition): Promise<ModuleAppSettingsDoc> {
  const defaults = getDefaultModuleAppSettings(def);
  try {
    const db = getDb();
    const snap = await db.collection(COLLECTIONS.MODULE_SETTINGS).doc(def.slug).get();
    if (snap.exists) {
      const data = snap.data() as Partial<ModuleAppSettingsDoc>;
      return {
        ...defaults,
        ...data,
        slug: def.slug,
        visibleColumns: data.visibleColumns?.length ? data.visibleColumns : defaults.visibleColumns,
        customMetrics: data.customMetrics?.length ? data.customMetrics : defaults.customMetrics,
        charts: data.charts?.length ? data.charts : defaults.charts,
        triggers: data.triggers ?? defaults.triggers,
        apiEndpoints: data.apiEndpoints ?? defaults.apiEndpoints,
        detailFields: data.detailFields?.length ? data.detailFields : defaults.detailFields,
      };
    }
  } catch {
    // Use defaults
  }
  return defaults;
}
