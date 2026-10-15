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
  validateRecordPatch,
  validateRecordCompletion,
  resolvePhotoEvidence,
  deriveDueAt,
  executeRecordTrigger,
  auditRecordEvent,
  requireIdempotencyKey,
} from "@/lib/modules/runtime";
import { COLLECTIONS } from "@/lib/schema";
import type { ModuleRecordDoc } from "@/lib/adams-harness/types";

const patchSchema = z.strictObject({
  formId: z.string().regex(/^[a-z][a-z0-9_]*$/).max(60).optional(),
  data: z.record(z.string(), z.unknown()).optional(),
  status: z.enum(["active", "completed", "archived"]).optional(),
});

type Ctx = { params: Promise<{ slug: string; id: string }> };

export async function PATCH(request: NextRequest, { params }: Ctx) {
  try {
    const actor = await requireUser(request);
    const { slug, id } = await params;
    const definition = await getAuthorizedModule(actor, slug);

    const parsed = patchSchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new HttpError(400, "Invalid patch");
    }
    const idempotencyKey = requireIdempotencyKey(request);

    const db = getDb();
    const ref = db.collection(COLLECTIONS.MODULE_RECORDS).doc(id);

    const result = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) {
        throw new HttpError(404, "Record not found");
      }
      const record = { id: snap.id, ...snap.data() } as ModuleRecordDoc;
      if (
        record.moduleSlug !== definition.slug ||
        record.departmentId !== definition.departmentId
      ) {
        throw new HttpError(404, "Record not found");
      }
      if (
        record.lastMutationKey === idempotencyKey &&
        record.lastMutationByUid === actor.uid
      ) {
        return { record, replayed: true };
      }

      const recordType = definition.recordTypes.find(
        (r) => r.id === record.recordTypeId,
      );
      if (!recordType) {
        throw new HttpError(500, "Record references unknown record type");
      }

      const mergedData = { ...record.data };
      if (parsed.data.data) {
        const patch = validateRecordPatch(definition, record, parsed.data.data);
        Object.assign(mergedData, patch);
      }

      const formId = parsed.data.formId ?? record.formId;
      let evidencePaths = record.evidencePaths;
      if (parsed.data.status === "completed") {
        validateRecordCompletion(
          definition,
          recordType,
          formId,
          mergedData,
        );
        const resolved = await resolvePhotoEvidence(
          definition,
          recordType,
          record.departmentId,
          mergedData,
          actor,
        );
        evidencePaths = [
          ...new Set([...record.evidencePaths, ...resolved.evidencePaths]),
        ];
      } else if (parsed.data.data) {
        const resolved = await resolvePhotoEvidence(
          definition,
          recordType,
          record.departmentId,
          mergedData,
          actor,
        );
        evidencePaths = [
          ...new Set([...record.evidencePaths, ...resolved.evidencePaths]),
        ];
      }

      const now = new Date() as unknown as ModuleRecordDoc["updatedAt"];
      const nextStatus = parsed.data.status ?? record.status;
      if (record.status === "archived" && nextStatus !== "archived") {
        throw new HttpError(400, "Archived records cannot be reactivated");
      }
      const dueAt = deriveDueAt(recordType, mergedData);
      const nextVersion = (record.version ?? 1) + 1;
      const update: Record<string, unknown> = {
        updatedAt: now,
        data: mergedData,
        evidencePaths,
        version: nextVersion,
        lastMutationKey: idempotencyKey,
        lastMutationByUid: actor.uid,
        status: nextStatus,
        ...(parsed.data.formId ? { formId: parsed.data.formId } : {}),
      };
      if (dueAt) update.dueAt = dueAt;
      if (nextStatus === "completed" && record.status !== "completed") {
        update.completedAt = now;
      }
      tx.update(ref, update);
      return {
        record: { ...record, ...update } as ModuleRecordDoc,
        replayed: false,
      };
    });

    const { record: updated, replayed } = result;
    if (replayed) {
      return Response.json({ record: serializeDoc(updated) });
    }

    await auditRecordEvent("update", updated.id, {
      uid: actor.uid,
      name: actor.email,
      role: actor.role,
    }, {
      moduleSlug: definition.slug,
      recordTypeId: updated.recordTypeId,
      status: updated.status,
      version: updated.version,
    });
    await executeRecordTrigger(definition, "record_updated", updated, {
      uid: actor.uid,
      teamMemberId: actor.teamMemberId,
    }, `record-updated-${updated.id}-v${updated.version}`);

    return Response.json({ record: serializeDoc(updated) });
  } catch (error) {
    if (error instanceof ApiAuthError) return authErrorResponse(error);
    const http = httpErrorResponse(error);
    if (http) return http;
    console.error("Module record update error:", error);
    return Response.json({ error: "Failed to update record." }, { status: 500 });
  }
}
