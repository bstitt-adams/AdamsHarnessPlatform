import { createHash } from "crypto";
import type { Timestamp } from "firebase/firestore";
import { getGeneratedModule } from "@/modules/generated/registry";
import { listAllAvailableModules, getModuleAppSettings } from "@/lib/modules/dynamic-catalog";
import { COLLECTIONS, type TeamMemberDoc } from "@/lib/schema";
import type { AuthenticatedActor } from "@/lib/auth/server-auth";
import {
  getDb,
  isAdminActor,
  canAccessDepartment,
  writeAuditLog,
  HttpError,
} from "@/lib/adams-harness/server-store";
import type {
  DepartmentDoc,
  ModuleNotificationDoc,
  ModuleRecordDoc,
  ModuleUploadDoc,
} from "@/lib/adams-harness/types";
import type {
  ModuleDefinition,
  ModuleField,
  ModuleRecordType,
  ModuleForm,
  ModuleWorkflow,
} from "@/lib/modules/contract";

export type ModuleRecordValue = string | number | boolean | null;
export type ModuleRecordData = Record<string, ModuleRecordValue>;

const ts = (date: Date = new Date()): Timestamp =>
  date as unknown as Timestamp;

export async function getAuthorizedModule(
  actor: AuthenticatedActor,
  slug: string,
): Promise<ModuleDefinition> {
  let definition = getGeneratedModule(slug);
  if (!definition) {
    const dynamicList = await listAllAvailableModules();
    definition = dynamicList.find((m) => m.slug === slug);
  }
  if (!definition) {
    throw new HttpError(404, "Module not found");
  }
  if (isAdminActor(actor) || actor.departmentIds.includes(definition.departmentId)) {
    return definition;
  }
  const snap = await getDb()
    .collection(COLLECTIONS.DEPARTMENTS)
    .doc(definition.departmentId)
    .get();
  if (snap.exists) {
    const department = { id: snap.id, ...snap.data() } as DepartmentDoc;
    if (canAccessDepartment(actor, department)) {
      return definition;
    }
  }
  throw new HttpError(403, "Not authorized for this module");
}

const PHOTO_ID_PATTERN = /^[A-Za-z0-9_-]{1,200}$/;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DATETIME_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d{1,3})?(Z|[+-]\d{2}:?\d{2})?$/;

export function isValidCalendarDate(value: string): boolean {
  if (!ISO_DATE_PATTERN.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d
  );
}

function isValidDateTime(value: string): boolean {
  return ISO_DATETIME_PATTERN.test(value) && !Number.isNaN(Date.parse(value));
}

function validateFieldValue(
  field: ModuleField,
  value: unknown,
): ModuleRecordValue {
  if (value === undefined || value === null || value === "") {
    if (field.required) {
      throw new HttpError(400, `Field "${field.label}" is required`);
    }
    return null;
  }
  switch (field.type) {
    case "checkbox": {
      if (typeof value !== "boolean") {
        throw new HttpError(400, `Field "${field.label}" must be true or false`);
      }
      return value;
    }
    case "number": {
      const n = typeof value === "number" ? value : Number(value);
      if (typeof value === "boolean" || !Number.isFinite(n)) {
        throw new HttpError(400, `Field "${field.label}" must be a number`);
      }
      if (field.min !== undefined && n < field.min) {
        throw new HttpError(400, `Field "${field.label}" is below minimum`);
      }
      if (field.max !== undefined && n > field.max) {
        throw new HttpError(400, `Field "${field.label}" is above maximum`);
      }
      return n;
    }
    case "date": {
      if (typeof value !== "string" || !isValidCalendarDate(value)) {
        throw new HttpError(400, `Field "${field.label}" must be a YYYY-MM-DD date`);
      }
      return value;
    }
    case "datetime": {
      if (typeof value !== "string" || !isValidDateTime(value)) {
        throw new HttpError(400, `Field "${field.label}" must be a datetime`);
      }
      return value;
    }
    case "select":
    case "radio": {
      if (typeof value !== "string" || !field.options?.includes(value)) {
        throw new HttpError(400, `Field "${field.label}" must be one of the allowed options`);
      }
      return value;
    }
    case "photo": {
      if (typeof value !== "string" || !PHOTO_ID_PATTERN.test(value)) {
        throw new HttpError(400, `Field "${field.label}" must be an upload ID`);
      }
      return value;
    }
    case "signature":
    case "text":
    case "textarea":
    default: {
      if (typeof value !== "string") {
        throw new HttpError(400, `Field "${field.label}" must be text`);
      }
      const limit = field.maxLength ?? (field.type === "textarea" ? 10000 : field.type === "signature" ? 2000 : 2000);
      if (value.length > limit) {
        throw new HttpError(400, `Field "${field.label}" exceeds maximum length`);
      }
      return value;
    }
  }
}

export function validateFormSubmission(
  def: ModuleDefinition,
  formId: string,
  rawData: unknown,
): { form: ModuleForm; recordType: ModuleRecordType; data: ModuleRecordData } {
  const form = def.forms.find((f) => f.id === formId);
  if (!form) {
    throw new HttpError(400, "Unknown form");
  }
  const recordType = def.recordTypes.find((r) => r.id === form.recordTypeId);
  if (!recordType) {
    throw new HttpError(500, "Form references unknown record type");
  }
  if (typeof rawData !== "object" || rawData === null || Array.isArray(rawData)) {
    throw new HttpError(400, "Form data must be an object");
  }
  const allowed = new Set(form.fields);
  const fields = new Map(recordType.fields.map((f) => [f.id, f]));
  const data: ModuleRecordData = {};
  for (const [key, value] of Object.entries(rawData as Record<string, unknown>)) {
    if (!allowed.has(key)) {
      throw new HttpError(400, `Unknown field "${key}"`);
    }
    const field = fields.get(key);
    if (!field) {
      throw new HttpError(400, `Unknown field "${key}"`);
    }
    data[key] = validateFieldValue(field, value);
  }
  for (const fieldId of form.fields) {
    const field = fields.get(fieldId);
    if (!field) continue;
    if (!(fieldId in data)) {
      data[fieldId] = validateFieldValue(field, null);
    }
  }
  return { form, recordType, data };
}

export function validateRecordPatch(
  def: ModuleDefinition,
  record: ModuleRecordDoc,
  rawData: unknown,
): ModuleRecordData {
  const recordType = def.recordTypes.find((r) => r.id === record.recordTypeId);
  if (!recordType) {
    throw new HttpError(500, "Record references unknown record type");
  }
  if (typeof rawData !== "object" || rawData === null || Array.isArray(rawData)) {
    throw new HttpError(400, "Patch data must be an object");
  }
  const fields = new Map(recordType.fields.map((f) => [f.id, f]));
  const data: ModuleRecordData = {};
  for (const [key, value] of Object.entries(rawData as Record<string, unknown>)) {
    const field = fields.get(key);
    if (!field) {
      throw new HttpError(400, `Unknown field "${key}"`);
    }
    data[key] = validateFieldValue(field, value);
  }
  return data;
}

const TEMPLATE_PATTERN = /\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g;

export function renderTemplate(
  template: string,
  context: { record: ModuleRecordDoc; actorUid?: string; actorTeamMemberId?: string },
): string {
  return template.replace(TEMPLATE_PATTERN, (match, token: string) => {
    if (token === "actor.uid") return context.actorUid ?? "";
    if (token === "actor.teamMemberId") return context.actorTeamMemberId ?? "";
    if (token === "record.id") return context.record.id;
    if (token.startsWith("record.")) {
      const fieldId = token.slice("record.".length);
      const value = context.record.data[fieldId];
      if (value === null || value === undefined) return "";
      return String(value);
    }
    return "";
  });
}

function deterministicId(prefix: string, key: string): string {
  const hash = createHash("sha256").update(key).digest("hex").slice(0, 40);
  return `${prefix}_${hash}`;
}

async function resolveTeamMember(
  idOrUid: string,
): Promise<TeamMemberDoc | null> {
  const db = getDb();
  const direct = await db.collection(COLLECTIONS.TEAM_MEMBERS).doc(idOrUid).get();
  if (direct.exists) {
    return { id: direct.id, ...direct.data() } as TeamMemberDoc;
  }
  const byUid = await db
    .collection(COLLECTIONS.TEAM_MEMBERS)
    .where("firebaseUid", "==", idOrUid)
    .limit(1)
    .get();
  if (!byUid.empty) {
    return { id: byUid.docs[0].id, ...byUid.docs[0].data() } as TeamMemberDoc;
  }
  return null;
}

export async function executeWorkflowActions(
  def: ModuleDefinition,
  workflow: ModuleWorkflow,
  record: ModuleRecordDoc,
  actor: { uid: string; teamMemberId?: string },
  eventId: string,
): Promise<void> {
  const db = getDb();
  const batch = db.batch();
  const ctx = {
    record,
    actorUid: actor.uid,
    actorTeamMemberId: actor.teamMemberId,
  };

  for (const [index, action] of workflow.actions.entries()) {
    const actionKey = `${eventId}:${index}`;
    if (action.type === "create_record") {
      const target = def.recordTypes.find((r) => r.id === action.recordTypeId);
      if (!target) continue;
      const data: ModuleRecordData = {};
      for (const field of target.fields) {
        const template = action.fieldTemplates[field.id];
        const rendered =
          template === undefined ? null : renderTemplate(template, ctx);
        data[field.id] =
          field.type === "photo" && rendered !== null
            ? PHOTO_ID_PATTERN.test(rendered)
              ? rendered
              : null
            : rendered;
      }
      const dueAt = deriveDueAt(target, data);
      const assignment = deriveAssignment(target, data);
      const ref = db
        .collection(COLLECTIONS.MODULE_RECORDS)
        .doc(deterministicId("mod", actionKey));
      const now = ts();
      batch.set(ref, {
        id: ref.id,
        moduleSlug: def.slug,
        recordTypeId: target.id,
        formId: action.formId,
        departmentId: record.departmentId,
        data,
        status: "active",
        ...assignment,
        ...(dueAt ? { dueAt } : {}),
        evidencePaths: [],
        sourceRecordId: record.id,
        version: 1,
        createdByUid: actor.uid,
        createdByTeamMemberId: actor.teamMemberId,
        createdAt: now,
        updatedAt: now,
      } satisfies ModuleRecordDoc);
    } else if (action.type === "update_record") {
      const patch: Record<string, unknown> = { updatedAt: ts() };
      for (const [key, template] of Object.entries(
        action.fieldTemplates as Record<string, string>,
      )) {
        patch[`data.${key}`] = renderTemplate(template, ctx);
      }
      if (action.status) {
        patch.status = action.status;
        if (action.status === "completed") {
          patch.completedAt = ts();
        }
      }
      batch.update(db.collection(COLLECTIONS.MODULE_RECORDS).doc(record.id), patch);
    } else if (action.type === "mark_complete") {
      if (record.status !== "completed") {
        batch.update(db.collection(COLLECTIONS.MODULE_RECORDS).doc(record.id), {
          status: "completed",
          completedAt: ts(),
          updatedAt: ts(),
        });
      }
    } else {
      const message = renderTemplate(action.messageTemplate, ctx);
      let recipientUid: string | undefined;
      let recipientTeamMemberId: string | undefined;
      if (action.type === "notify_user") {
        const target = action.targetFieldId
          ? record.data[action.targetFieldId]
          : undefined;
        if (typeof target === "string" && target) {
          const member = await resolveTeamMember(target);
          if (member) {
            recipientTeamMemberId = member.id;
            recipientUid = member.firebaseUid ?? member.authUid;
          } else {
            recipientUid = target;
          }
        } else {
          recipientUid = record.assignedToUid ?? record.createdByUid;
          recipientTeamMemberId =
            record.assignedToTeamMemberId ?? record.createdByTeamMemberId;
        }
      } else {
        const memberId =
          record.assignedToTeamMemberId ?? record.createdByTeamMemberId;
        if (memberId) {
          const member = await resolveTeamMember(memberId);
          if (member?.supervisorId) {
            const supervisor = await resolveTeamMember(member.supervisorId);
            if (supervisor) {
              recipientTeamMemberId = supervisor.id;
              recipientUid = supervisor.firebaseUid ?? supervisor.authUid;
            }
          }
        }
      }
      if (!recipientUid && !recipientTeamMemberId) continue;
      const ref = db
        .collection(COLLECTIONS.MODULE_NOTIFICATIONS)
        .doc(deterministicId("ntf", actionKey));
      batch.set(ref, {
        id: ref.id,
        departmentId: record.departmentId,
        moduleSlug: def.slug,
        recordId: record.id,
        recipientUid,
        recipientTeamMemberId,
        type: action.type === "notify_supervisor" ? "escalation" : "reminder",
        title: `${def.name}: ${workflow.label}`,
        message,
        read: false,
        createdAt: ts(),
      } satisfies ModuleNotificationDoc);
    }
  }
  await batch.commit();
}

export async function executeRecordTrigger(
  def: ModuleDefinition,
  trigger: "record_created" | "record_updated",
  record: ModuleRecordDoc,
  actor: { uid: string; teamMemberId?: string },
  eventId: string,
): Promise<void> {
  const workflows = def.workflows.filter(
    (w) => w.trigger === trigger && w.recordTypeId === record.recordTypeId,
  );
  for (const workflow of workflows) {
    try {
      await executeWorkflowActions(def, workflow, record, actor, `${eventId}:${workflow.id}`);
    } catch (error) {
      console.error(
        `Module workflow ${workflow.id} failed for record ${record.id}:`,
        error instanceof Error ? error.message : "unknown",
      );
    }
  }

  // Also execute custom user/AI-defined triggers from ModuleAppSettingsDoc
  try {
    const appSettings = await getModuleAppSettings(def);
    const db = getDb();
    const ctx = {
      record,
      actorUid: actor.uid,
      actorTeamMemberId: actor.teamMemberId,
    };

    for (const rule of appSettings.triggers) {
      if (!rule.enabled) continue;
      const matchesEvent =
        rule.event === trigger ||
        (rule.event === "status_completed" &&
          trigger === "record_updated" &&
          record.status === "completed");
      if (!matchesEvent) continue;

      if (rule.conditionField) {
        const rawVal = String(record.data[rule.conditionField] ?? "").toLowerCase();
        const targetVal = (rule.conditionValue ?? "").toLowerCase();
        if (rule.conditionOperator === "equals" && rawVal !== targetVal) continue;
        if (rule.conditionOperator === "contains" && !rawVal.includes(targetVal)) continue;
        if (rule.conditionOperator === "not_empty" && !rawVal.trim()) continue;
      }

      const renderedMessage = renderTemplate(rule.messageTemplate, ctx);
      const ruleEventKey = `${eventId}:rule:${rule.id}`;

      if (rule.actionType === "in_app_notification") {
        const ref = db
          .collection(COLLECTIONS.MODULE_NOTIFICATIONS)
          .doc(deterministicId("ntf", ruleEventKey));
        await ref.set({
          id: ref.id,
          departmentId: record.departmentId,
          moduleSlug: def.slug,
          recordId: record.id,
          recipientUid: record.assignedToUid ?? actor.uid,
          recipientTeamMemberId: record.assignedToTeamMemberId ?? actor.teamMemberId,
          type: "reminder",
          title: `${def.name}: ${rule.name}`,
          message: renderedMessage,
          read: false,
          createdAt: ts(),
        } satisfies ModuleNotificationDoc);
      } else if (rule.actionType === "webhook" && rule.webhookUrl) {
        await fetch(rule.webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            moduleSlug: def.slug,
            moduleName: def.name,
            trigger: rule.name,
            event: rule.event,
            message: renderedMessage,
            record: {
              id: record.id,
              status: record.status,
              data: record.data,
            },
          }),
        }).catch(() => {});
      } else if (rule.actionType === "mark_completed" && record.status !== "completed") {
        await db.collection(COLLECTIONS.MODULE_RECORDS).doc(record.id).update({
          status: "completed",
          completedAt: ts(),
          updatedAt: ts(),
        });
      }
    }
  } catch (err) {
    console.error("Custom trigger execution error:", err);
  }
}

export async function resolvePhotoEvidence(
  def: ModuleDefinition,
  recordType: ModuleRecordType,
  departmentId: string,
  data: ModuleRecordData,
  actor: { uid: string; role?: string },
): Promise<{ data: ModuleRecordData; evidencePaths: string[] }> {
  const db = getDb();
  const evidencePaths: string[] = [];
  const next = { ...data };
  const isAdmin = actor.role === "superadmin" || actor.role === "admin";
  for (const field of recordType.fields) {
    if (field.type !== "photo") continue;
    const value = next[field.id];
    if (value === null || value === undefined) continue;
    if (typeof value !== "string" || !PHOTO_ID_PATTERN.test(value)) {
      throw new HttpError(400, `Field "${field.label}" must be an upload ID`);
    }
    const snap = await db.collection(COLLECTIONS.MODULE_UPLOADS).doc(value).get();
    if (!snap.exists) {
      throw new HttpError(400, `Field "${field.label}" references an unknown upload`);
    }
    const upload = snap.data() as ModuleUploadDoc;
    if (
      upload.moduleSlug !== def.slug ||
      upload.departmentId !== departmentId ||
      upload.fieldId !== field.id
    ) {
      throw new HttpError(403, `Field "${field.label}" upload is not accessible`);
    }
    if (!isAdmin && upload.ownerUid !== actor.uid) {
      throw new HttpError(403, `Field "${field.label}" upload is not accessible`);
    }
    evidencePaths.push(upload.storagePath);
  }
  return { data: next, evidencePaths };
}

export function validateRecordCompletion(
  def: ModuleDefinition,
  recordType: ModuleRecordType,
  formId: string | undefined,
  fullData: ModuleRecordData,
): ModuleForm {
  const form = def.forms.find(
    (f) => f.id === formId && f.recordTypeId === recordType.id,
  );
  if (!form) {
    throw new HttpError(400, "Record has no valid form to complete against");
  }
  const fields = new Map<string, ModuleField>(
    recordType.fields.map((f) => [f.id, f]),
  );
  for (const fieldId of form.fields) {
    const field = fields.get(fieldId);
    if (!field || !field.required) continue;
    const value = fullData[fieldId];
    if (value === undefined || value === null || value === "") {
      throw new HttpError(400, `Field "${field.label}" is required for completion`);
    }
    if (field.type === "checkbox" && typeof value !== "boolean") {
      throw new HttpError(400, `Field "${field.label}" must be answered`);
    }
    if (field.type === "select" || field.type === "radio") {
      if (!field.options?.includes(value as string)) {
        throw new HttpError(400, `Field "${field.label}" is invalid`);
      }
    }
    if (field.type === "photo") {
      if (typeof value !== "string" || !PHOTO_ID_PATTERN.test(value)) {
        throw new HttpError(400, `Field "${field.label}" must be an upload ID`);
      }
    }
  }
  return form;
}

export function moduleRecordId(uid: string, slug: string, key: string): string {
  return deterministicId("rec", `${uid}|${slug}|${key}`);
}

export const IDEMPOTENCY_KEY_PATTERN = /^[\w.-]{8,128}$/;

export function requireIdempotencyKey(request: {
  headers: { get(name: string): string | null };
}): string {
  const key = request.headers.get("idempotency-key") ?? "";
  if (!IDEMPOTENCY_KEY_PATTERN.test(key)) {
    throw new HttpError(400, "Valid Idempotency-Key header is required");
  }
  return key;
}

export function assertPhotoFieldExists(
  def: ModuleDefinition,
  fieldId: string,
): ModuleField {
  for (const rt of def.recordTypes) {
    const field = rt.fields.find((f) => f.id === fieldId);
    if (field) {
      if (field.type !== "photo") {
        throw new HttpError(400, "fieldId must reference a photo field");
      }
      return field;
    }
  }
  throw new HttpError(400, "Unknown fieldId");
}

export function deriveDueAt(
  recordType: ModuleRecordType,
  data: ModuleRecordData,
): Timestamp | undefined {
  const dateField = recordType.fields.find(
    (f) =>
      (f.type === "date" || f.type === "datetime") &&
      (f.id.includes("due") || f.label.toLowerCase().includes("due")),
  );
  if (!dateField) return undefined;
  const value = data[dateField.id];
  if (typeof value !== "string" || !value) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed as unknown as Timestamp;
}

export function deriveAssignment(
  recordType: ModuleRecordType,
  data: ModuleRecordData,
): { assignedToUid?: string; assignedToTeamMemberId?: string } {
  for (const field of recordType.fields) {
    if (
      field.id.includes("assigned") ||
      field.id.includes("driver") ||
      field.id.includes("inspector") ||
      field.id.includes("owner")
    ) {
      const value = data[field.id];
      if (typeof value === "string" && value) {
        return { assignedToTeamMemberId: value };
      }
    }
  }
  return {};
}

export async function auditRecordEvent(
  action: string,
  recordId: string,
  actor: { uid: string; name: string; role: string },
  detail?: Record<string, string | number | boolean | null>,
): Promise<void> {
  try {
    await writeAuditLog({
      entityType: "module_record",
      entityId: recordId,
      action,
      actorUid: actor.uid,
      actorName: actor.name,
      actorRole: actor.role,
      detail,
    });
  } catch {}
}
