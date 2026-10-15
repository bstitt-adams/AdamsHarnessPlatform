import { createHash } from "crypto";
import type { Timestamp } from "firebase/firestore";
import { GENERATED_MODULES } from "@/modules/generated/registry";
import { COLLECTIONS } from "@/lib/schema";
import { getDb } from "@/lib/adams-harness/server-store";
import type {
  ModuleRecordDoc,
  ModuleScheduleRunDoc,
} from "@/lib/adams-harness/types";
import type {
  ModuleDefinition,
  ModuleWorkflow,
} from "@/lib/modules/contract";
import { executeWorkflowActions } from "@/lib/modules/runtime";

const MAX_RECORDS_PER_RUN = 100;
const SYSTEM_ACTOR = { uid: "module-scheduler" };

function runIdFor(parts: string[]): string {
  const hash = createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 48);
  return `run_${hash}`;
}

function parseScheduleDate(value: unknown): Date | null {
  if (typeof value !== "string" || !value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function addCalendarMonths(date: Date, months: number): Date {
  const next = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
  const lastDay = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)).getUTCDate();
  next.setUTCDate(Math.min(date.getUTCDate(), lastDay));
  return next;
}

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

type RunStatus = "queued" | "running" | "completed" | "failed";
type RunOutcome = "completed" | "failed" | "running" | "already_completed";

async function claimRun(
  runId: string,
  moduleSlug: string,
  workflowId: string,
  recordId: string,
): Promise<RunStatus | null> {
  const db = getDb();
  const ref = db.collection(COLLECTIONS.MODULE_SCHEDULE_RUNS).doc(runId);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists) {
      return (snap.data() as ModuleScheduleRunDoc).status;
    }
    const now = new Date() as unknown as Timestamp;
    tx.set(ref, {
      id: runId,
      moduleSlug,
      workflowId,
      status: "running",
      detail: `record:${recordId}`,
      createdAt: now,
      updatedAt: now,
    } satisfies ModuleScheduleRunDoc);
    return null;
  });
}

async function finishRun(
  runId: string,
  status: "completed" | "failed",
  detail?: string,
): Promise<void> {
  await getDb()
    .collection(COLLECTIONS.MODULE_SCHEDULE_RUNS)
    .doc(runId)
    .update({
      status,
      ...(detail ? { detail: detail.slice(0, 500) } : {}),
      updatedAt: new Date() as unknown as Timestamp,
    });
}

async function executeOnce(
  def: ModuleDefinition,
  workflow: ModuleWorkflow,
  record: ModuleRecordDoc,
  runId: string,
): Promise<RunOutcome> {
  const existing = await claimRun(runId, def.slug, workflow.id, record.id);
  if (existing !== null) {
    return existing === "completed" ? "already_completed" : existing === "failed" ? "failed" : "running";
  }
  try {
    await executeWorkflowActions(def, workflow, record, SYSTEM_ACTOR, runId);
    await finishRun(runId, "completed");
    return "completed";
  } catch (error) {
    await finishRun(
      runId,
      "failed",
      error instanceof Error ? error.message : "unknown",
    );
    return "failed";
  }
}

async function processScheduleWorkflow(
  def: ModuleDefinition,
  workflow: ModuleWorkflow,
  now: Date,
  budget: { remaining: number },
): Promise<void> {
  const fieldId = workflow.schedule!.fieldId;
  const snapshot = await getDb()
    .collection(COLLECTIONS.MODULE_RECORDS)
    .where("moduleSlug", "==", def.slug)
    .where("departmentId", "==", def.departmentId)
    .where("recordTypeId", "==", workflow.recordTypeId)
    .where("status", "==", "active")
    .limit(MAX_RECORDS_PER_RUN)
    .get();
  for (const doc of snapshot.docs) {
    if (budget.remaining <= 0) return;
    const record = { id: doc.id, ...doc.data() } as ModuleRecordDoc;
    const due = parseScheduleDate(record.data[fieldId]);
    if (!due || due.getTime() > now.getTime()) continue;
    budget.remaining -= 1;
    const dueIso = toDateString(due);
    const runId = runIdFor(["schedule", def.slug, workflow.id, record.id, dueIso]);
    const outcome = await executeOnce(def, workflow, record, runId);
    if (
      workflow.schedule!.recurrenceMonths &&
      (outcome === "completed" || outcome === "already_completed")
    ) {
      const next = addCalendarMonths(due, workflow.schedule!.recurrenceMonths);
      await doc.ref.update({
        [`data.${fieldId}`]: toDateString(next),
        updatedAt: new Date() as unknown as Timestamp,
      });
    }
  }
}

async function processOverdueWorkflow(
  def: ModuleDefinition,
  workflow: ModuleWorkflow,
  now: Date,
  budget: { remaining: number },
): Promise<void> {
  const snapshot = await getDb()
    .collection(COLLECTIONS.MODULE_RECORDS)
    .where("moduleSlug", "==", def.slug)
    .where("departmentId", "==", def.departmentId)
    .where("recordTypeId", "==", workflow.recordTypeId)
    .where("status", "==", "active")
    .limit(MAX_RECORDS_PER_RUN)
    .get();
  for (const doc of snapshot.docs) {
    if (budget.remaining <= 0) return;
    const record = { id: doc.id, ...doc.data() } as ModuleRecordDoc;
    if (!record.dueAt) continue;
    const dueDate = record.dueAt.toDate();
    const threshold = new Date(
      dueDate.getTime() + workflow.delayDays * 24 * 60 * 60 * 1000,
    );
    if (threshold.getTime() > now.getTime()) continue;
    budget.remaining -= 1;
    const runId = runIdFor([
      "overdue",
      def.slug,
      workflow.id,
      record.id,
      toDateString(dueDate),
    ]);
    await executeOnce(def, workflow, record, runId);
  }
}

export async function runScheduledModuleWorkflows(
  now: Date = new Date(),
): Promise<{ processed: number }> {
  const budget = { remaining: MAX_RECORDS_PER_RUN };
  for (const def of GENERATED_MODULES) {
    for (const workflow of def.workflows) {
      if (budget.remaining <= 0) break;
      try {
        if (workflow.trigger === "schedule" && workflow.schedule) {
          await processScheduleWorkflow(def, workflow, now, budget);
        } else if (workflow.trigger === "overdue") {
          await processOverdueWorkflow(def, workflow, now, budget);
        }
      } catch (error) {
        console.error(
          `Scheduled workflow ${workflow.id} for module ${def.slug} failed:`,
          error instanceof Error ? error.message : "unknown",
        );
      }
    }
  }
  return { processed: MAX_RECORDS_PER_RUN - budget.remaining };
}
