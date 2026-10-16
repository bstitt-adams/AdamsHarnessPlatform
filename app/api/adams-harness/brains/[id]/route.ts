import { NextRequest } from "next/server";
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
  writeAuditLog,
  assertValidMemberIds,
} from "@/lib/adams-harness/server-store";
import { getBrainForActor } from "@/lib/adams-brain/access";
import { COLLECTIONS } from "@/lib/schema";
import {
  brainPatchSchema,
  type BrainSourceDoc,
  type DepartmentDoc,
} from "@/lib/adams-harness/types";

type Ctx = { params: Promise<{ id: string }> };

function safeSource(source: BrainSourceDoc) {
  const {
    id,
    type,
    connector,
    pageType,
    slug,
    tags,
    compiledTruth,
    timelineNotes,
    markdownContent,
    title,
    logicalKey,
    version,
    status,
    checksum,
    contentType,
    originalName,
    textLength,
    chunkCount,
    refreshedAt,
    createdAt,
    updatedAt,
    failureReason,
  } = source;
  return serializeDoc({
    id,
    type,
    connector,
    pageType,
    slug,
    tags,
    compiledTruth,
    timelineNotes,
    markdownContent,
    title,
    logicalKey,
    version,
    status,
    checksum,
    contentType,
    originalName,
    textLength,
    chunkCount,
    refreshedAt,
    createdAt,
    updatedAt,
    failureReason,
  });
}

export async function GET(request: NextRequest, { params }: Ctx) {
  try {
    const actor = await requireUser(request);
    const { id } = await params;
    const { brain, canQuery, canManage } = await getBrainForActor(actor, id);
    const snap = await getDb()
      .collection(COLLECTIONS.BRAIN_SOURCES)
      .where("brainId", "==", brain.id)
      .limit(200)
      .get();
    const sources = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }) as BrainSourceDoc)
      .filter((s) => s.status === "ready" || s.status === "processing" || (canManage && s.status !== "retired"))
      .map(safeSource);
    return Response.json({
      brain: serializeDoc(brain),
      capabilities: { canQuery, canManage },
      sources,
    });
  } catch (error) {
    if (error instanceof ApiAuthError) return authErrorResponse(error);
    const http = httpErrorResponse(error);
    if (http) return http;
    console.error("Brain get error:", error);
    return Response.json({ error: "Failed to load brain." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: Ctx) {
  try {
    const actor = await requireUser(request);
    const { id } = await params;
    const { brain, canManage } = await getBrainForActor(actor, id);
    if (!canManage) {
      throw new HttpError(403, "Not authorized to manage this brain");
    }
    const parsed = brainPatchSchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new HttpError(400, "Invalid brain patch");
    }
    if (parsed.data.ownerIds) {
      await assertValidMemberIds(parsed.data.ownerIds);
      const deptSnap = await getDb()
        .collection(COLLECTIONS.DEPARTMENTS)
        .doc(brain.departmentId)
        .get();
      if (deptSnap.exists) {
        const dept = { id: deptSnap.id, ...deptSnap.data() } as DepartmentDoc;
        const deptMembers = new Set([...dept.ownerIds, ...dept.memberIds]);
        if (parsed.data.ownerIds.some((id) => !deptMembers.has(id))) {
          throw new HttpError(400, "Brain owners must belong to the department");
        }
      }
    }
    const update = {
      ...parsed.data,
      updatedAt: new Date() as unknown as BrainSourceDoc["updatedAt"],
    };
    await getDb().collection(COLLECTIONS.ADAMS_BRAINS).doc(brain.id).update(update);
    await writeAuditLog({
      entityType: "brain",
      entityId: brain.id,
      action: "update",
      actorUid: actor.uid,
      actorName: actor.email,
      actorRole: actor.role,
      detail: { fields: Object.keys(parsed.data).join(",") },
    });
    return Response.json({ brain: serializeDoc({ ...brain, ...update }) });
  } catch (error) {
    if (error instanceof ApiAuthError) return authErrorResponse(error);
    const http = httpErrorResponse(error);
    if (http) return http;
    console.error("Brain update error:", error);
    return Response.json({ error: "Failed to update brain." }, { status: 500 });
  }
}
