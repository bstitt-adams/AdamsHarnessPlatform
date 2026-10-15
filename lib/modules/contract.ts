import { z } from "zod";

export const moduleSlugSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .max(60);

const safeId = z.string().regex(/^[a-z][a-z0-9_]*$/).max(60);

export const moduleFieldTypeSchema = z.enum([
  "text",
  "textarea",
  "number",
  "date",
  "datetime",
  "select",
  "radio",
  "checkbox",
  "photo",
  "signature",
]);

export const moduleFieldSchema = z.strictObject({
  id: safeId,
  label: z.string().trim().min(1).max(200),
  type: moduleFieldTypeSchema,
  required: z.boolean().default(false),
  options: z.array(z.string().trim().min(1).max(200)).max(100).optional(),
  helpText: z.string().trim().max(500).optional(),
  min: z.number().finite().optional(),
  max: z.number().finite().optional(),
  maxLength: z.number().int().min(1).max(10000).optional(),
});

export const moduleRecordTypeSchema = z.strictObject({
  id: safeId,
  label: z.string().trim().min(1).max(200),
  fields: z.array(moduleFieldSchema).max(100),
});

export const moduleFormSchema = z.strictObject({
  id: safeId,
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(1000).default(""),
  recordTypeId: safeId,
  fields: z.array(safeId).max(100),
  submitLabel: z.string().trim().max(100).default("Submit"),
});

export const moduleWorkflowTriggerSchema = z.enum([
  "record_created",
  "record_updated",
  "schedule",
  "overdue",
]);

export const moduleWorkflowScheduleSchema = z.strictObject({
  fieldId: safeId,
  recurrenceMonths: z.number().int().min(1).max(24).optional(),
});

export const moduleWorkflowActionSchema = z.discriminatedUnion("type", [
  z.strictObject({
    type: z.literal("create_record"),
    recordTypeId: safeId,
    formId: safeId,
    fieldTemplates: z.record(safeId, z.string().max(500)).default({}),
  }),
  z.strictObject({
    type: z.literal("update_record"),
    fieldTemplates: z.record(safeId, z.string().max(500)).default({}),
    status: z.enum(["active", "completed", "archived"]).optional(),
  }),
  z.strictObject({
    type: z.literal("notify_user"),
    targetFieldId: safeId.optional(),
    messageTemplate: z.string().trim().min(1).max(1000),
  }),
  z.strictObject({
    type: z.literal("notify_supervisor"),
    messageTemplate: z.string().trim().min(1).max(1000),
  }),
  z.strictObject({
    type: z.literal("mark_complete"),
  }),
]);

export const moduleWorkflowSchema = z.strictObject({
  id: safeId,
  label: z.string().trim().min(1).max(200),
  trigger: moduleWorkflowTriggerSchema,
  recordTypeId: safeId,
  delayDays: z.number().int().min(0).max(365).default(0),
  schedule: moduleWorkflowScheduleSchema.optional(),
  actions: z.array(moduleWorkflowActionSchema).max(20),
});

export const moduleDashboardWidgetSchema = z.discriminatedUnion("type", [
  z.strictObject({
    type: z.literal("count"),
    recordTypeId: safeId,
    label: z.string().trim().min(1).max(200),
  }),
  z.strictObject({
    type: z.literal("status_breakdown"),
    recordTypeId: safeId,
    label: z.string().trim().min(1).max(200),
  }),
  z.strictObject({
    type: z.literal("due_list"),
    recordTypeId: safeId,
    label: z.string().trim().min(1).max(200),
    limit: z.number().int().min(1).max(50).default(10),
  }),
]);

export const moduleDefinitionSchema = z.strictObject({
  schemaVersion: z.literal(1),
  slug: moduleSlugSchema,
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).default(""),
  departmentId: z.string().trim().min(1).max(200),
  icon: z.string().trim().min(1).max(50).default("folder"),
  recordTypes: z.array(moduleRecordTypeSchema).max(20),
  forms: z.array(moduleFormSchema).max(50),
  workflows: z.array(moduleWorkflowSchema).max(50),
  dashboards: z.array(moduleDashboardWidgetSchema).max(50),
});

export type ModuleDefinition = z.infer<typeof moduleDefinitionSchema>;
export type ModuleField = z.infer<typeof moduleFieldSchema>;
export type ModuleRecordType = z.infer<typeof moduleRecordTypeSchema>;
export type ModuleForm = z.infer<typeof moduleFormSchema>;
export type ModuleWorkflow = z.infer<typeof moduleWorkflowSchema>;
export type ModuleWorkflowAction = z.infer<typeof moduleWorkflowActionSchema>;
export type ModuleDashboardWidget = z.infer<typeof moduleDashboardWidgetSchema>;

function assertUniqueIds(items: { id: string }[], label: string): void {
  const seen = new Set<string>();
  for (const item of items) {
    if (seen.has(item.id)) {
      throw new Error(`Duplicate ${label} id "${item.id}"`);
    }
    seen.add(item.id);
  }
}

export function validateModuleDefinition(input: unknown): ModuleDefinition {
  const result = moduleDefinitionSchema.safeParse(input);
  if (!result.success) {
    throw new Error(`Invalid module definition: ${result.error.issues[0]?.message ?? "unknown"}`);
  }
  const def = result.data;

  assertUniqueIds(def.recordTypes, "record type");
  assertUniqueIds(def.forms, "form");
  assertUniqueIds(def.workflows, "workflow");

  const recordTypes = new Map(def.recordTypes.map((r) => [r.id, r]));
  for (const rt of def.recordTypes) {
    assertUniqueIds(rt.fields, `field in record type "${rt.id}"`);
    for (const field of rt.fields) {
      const isChoice = field.type === "select" || field.type === "radio";
      if (isChoice) {
        if (!field.options || field.options.length < 1) {
          throw new Error(`Field "${field.id}" of type "${field.type}" requires options`);
        }
      } else if (field.options !== undefined) {
        throw new Error(`Field "${field.id}" of type "${field.type}" may not define options`);
      }
      if (
        field.min !== undefined &&
        field.max !== undefined &&
        field.min > field.max
      ) {
        throw new Error(`Field "${field.id}" has min greater than max`);
      }
    }
  }

  for (const form of def.forms) {
    const rt = recordTypes.get(form.recordTypeId);
    if (!rt) {
      throw new Error(`Form "${form.id}" references unknown record type "${form.recordTypeId}"`);
    }
    const fieldIds = new Set(rt.fields.map((f) => f.id));
    for (const fieldId of form.fields) {
      if (!fieldIds.has(fieldId)) {
        throw new Error(`Form "${form.id}" references unknown field "${fieldId}"`);
      }
    }
  }

  for (const workflow of def.workflows) {
    const source = recordTypes.get(workflow.recordTypeId);
    if (!source) {
      throw new Error(`Workflow "${workflow.id}" references unknown record type "${workflow.recordTypeId}"`);
    }
    const sourceFields = new Map(source.fields.map((f) => [f.id, f]));
    if (workflow.schedule) {
      if (workflow.trigger !== "schedule") {
        throw new Error(`Workflow "${workflow.id}" schedule requires trigger "schedule"`);
      }
      const field = sourceFields.get(workflow.schedule.fieldId);
      if (!field) {
        throw new Error(`Workflow "${workflow.id}" schedule references unknown field "${workflow.schedule.fieldId}"`);
      }
      if (field.type !== "date" && field.type !== "datetime") {
        throw new Error(`Workflow "${workflow.id}" schedule field must be date or datetime`);
      }
    }
    for (const action of workflow.actions) {
      if (action.type === "create_record") {
        const target = recordTypes.get(action.recordTypeId);
        if (!target) {
          throw new Error(`Workflow "${workflow.id}" create_record references unknown record type "${action.recordTypeId}"`);
        }
        const form = def.forms.find((f) => f.id === action.formId);
        if (!form) {
          throw new Error(`Workflow "${workflow.id}" create_record references unknown form "${action.formId}"`);
        }
        if (form.recordTypeId !== action.recordTypeId) {
          throw new Error(`Workflow "${workflow.id}" create_record form "${action.formId}" targets a different record type`);
        }
        const targetFieldIds = new Set(target.fields.map((f) => f.id));
        for (const key of Object.keys(action.fieldTemplates)) {
          if (!targetFieldIds.has(key)) {
            throw new Error(`Workflow "${workflow.id}" create_record template references unknown field "${key}"`);
          }
        }
      } else if (action.type === "update_record") {
        for (const key of Object.keys(action.fieldTemplates)) {
          if (!sourceFields.has(key)) {
            throw new Error(`Workflow "${workflow.id}" update_record template references unknown field "${key}"`);
          }
        }
      } else if (action.type === "notify_user" && action.targetFieldId) {
        if (!sourceFields.has(action.targetFieldId)) {
          throw new Error(`Workflow "${workflow.id}" notify_user references unknown field "${action.targetFieldId}"`);
        }
      }
    }
  }

  for (const widget of def.dashboards) {
    if (!recordTypes.has(widget.recordTypeId)) {
      throw new Error(`Dashboard widget references unknown record type "${widget.recordTypeId}"`);
    }
  }
  return def;
}
