import { NextRequest } from "next/server";
import { z } from "zod";
import {
  authErrorResponse,
  requireUser,
  ApiAuthError,
} from "@/lib/auth/server-auth";
import {
  getDb,
  HttpError,
  httpErrorResponse,
  serializeDoc,
} from "@/lib/adams-harness/server-store";
import {
  getAuthorizedModule,
  validateFormSubmission,
  resolvePhotoEvidence,
  requireIdempotencyKey,
  moduleRecordId,
  deriveDueAt,
  deriveAssignment,
  executeRecordTrigger,
  auditRecordEvent,
} from "@/lib/modules/runtime";
import { COLLECTIONS } from "@/lib/schema";
import type { ModuleDashboardWidget } from "@/lib/modules/contract";
import type { ModuleRecordDoc } from "@/lib/adams-harness/types";

const createRecordSchema = z.strictObject({
  formId: z.string().regex(/^[a-z][a-z0-9_]*$/).max(60),
  data: z.record(z.string(), z.unknown()),
});

type Ctx = { params: Promise<{ slug: string }> };

function computeDashboard(
  widget: ModuleDashboardWidget,
  records: ModuleRecordDoc[],
): unknown {
  const scoped = records.filter((r) => r.recordTypeId === widget.recordTypeId);
  if (widget.type === "count") {
    return { label: widget.label, type: widget.type, value: scoped.length };
  }
  if (widget.type === "status_breakdown") {
    const breakdown: Record<string, number> = {};
    for (const record of scoped) {
      breakdown[record.status] = (breakdown[record.status] ?? 0) + 1;
    }
    return { label: widget.label, type: widget.type, breakdown };
  }
  const due = scoped
    .filter((r) => r.status === "active" && r.dueAt)
    .sort((a, b) => (a.dueAt!.toMillis() ?? 0) - (b.dueAt!.toMillis() ?? 0))
    .slice(0, widget.limit)
    .map((r) => ({ id: r.id, dueAt: serializeDoc(r).dueAt, status: r.status }));
  return { label: widget.label, type: widget.type, records: due };
}

export async function GET(request: NextRequest, { params }: Ctx) {
  try {
    const actor = await requireUser(request);
    const { slug } = await params;
    const definition = await getAuthorizedModule(actor, slug);

    const url = new URL(request.url);
    const recordTypeId = url.searchParams.get("recordTypeId");
    const status = url.searchParams.get("status");

    const snapshot = await getDb()
      .collection(COLLECTIONS.MODULE_RECORDS)
      .where("moduleSlug", "==", definition.slug)
      .where("departmentId", "==", definition.departmentId)
      .orderBy("createdAt", "desc")
      .limit(200)
      .get();

    let records = snapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() }) as ModuleRecordDoc,
    );
    if (recordTypeId) {
      records = records.filter((r) => r.recordTypeId === recordTypeId);
    }
    if (status === "active" || status === "completed" || status === "archived") {
      records = records.filter((r) => r.status === status);
    }

    const dashboards = definition.dashboards.map((widget) =>
      computeDashboard(widget, records),
    );
    return Response.json({
      records: records.map((r) => serializeDoc(r)),
      dashboards,
    });
  } catch (error) {
    if (error instanceof ApiAuthError) return authErrorResponse(error);
    const http = httpErrorResponse(error);
    if (http) return http;
    console.error("Module records list error:", error);
    return Response.json({ error: "Failed to load records." }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: Ctx) {
  try {
    const actor = await requireUser(request);
    const { slug } = await params;
    const definition = await getAuthorizedModule(actor, slug);

    const parsed = createRecordSchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new HttpError(400, "Invalid submission");
    }
    const { form, recordType, data } = validateFormSubmission(
      definition,
      parsed.data.formId,
      parsed.data.data,
    );
    const { data: resolvedData, evidencePaths } = await resolvePhotoEvidence(
      definition,
      recordType,
      definition.departmentId,
      data,
      actor,
    );
    const dueAt = deriveDueAt(recordType, resolvedData);
    const assignment = deriveAssignment(recordType, resolvedData);

    const idempotencyKey = requireIdempotencyKey(request);
    const db = getDb();
    const ref = db
      .collection(COLLECTIONS.MODULE_RECORDS)
      .doc(moduleRecordId(actor.uid, definition.slug, idempotencyKey));

    const created = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (snap.exists) {
        const existing = { id: snap.id, ...snap.data() } as ModuleRecordDoc;
        if (
          existing.createdByUid === actor.uid &&
          existing.moduleSlug === definition.slug
        ) {
          return { record: existing, replayed: true };
        }
        throw new HttpError(409, "Submission conflict");
      }
      const now = new Date() as unknown as ModuleRecordDoc["createdAt"];
      const record: ModuleRecordDoc = {
        id: ref.id,
        moduleSlug: definition.slug,
        recordTypeId: recordType.id,
        formId: form.id,
        departmentId: definition.departmentId,
        data: resolvedData,
        status: "active",
        ...assignment,
        ...(dueAt ? { dueAt } : {}),
        evidencePaths,
        version: 1,
        lastMutationKey: idempotencyKey,
        lastMutationByUid: actor.uid,
        createdByUid: actor.uid,
        createdByTeamMemberId: actor.teamMemberId,
        createdAt: now,
        updatedAt: now,
      };
      tx.set(ref, record);
      return { record, replayed: false };
    });
    const { record } = created;
    if (created.replayed) {
      return Response.json({ record: serializeDoc(record) });
    }
    await auditRecordEvent("create", record.id, {
      uid: actor.uid,
      name: actor.email,
      role: actor.role,
    }, { moduleSlug: definition.slug, recordTypeId: recordType.id, formId: form.id });
    await executeRecordTrigger(definition, "record_created", record, {
      uid: actor.uid,
      teamMemberId: actor.teamMemberId,
    }, `record-created-${record.id}`);
    return Response.json({ record: serializeDoc(record) }, { status: 201 });
  } catch (error) {
    if (error instanceof ApiAuthError) return authErrorResponse(error);
    const http = httpErrorResponse(error);
    if (http) return http;
    console.error("Module record create error:", error);
    return Response.json({ error: "Failed to create record." }, { status: 500 });
  }
}
