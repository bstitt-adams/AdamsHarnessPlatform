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
} from "@/lib/adams-harness/server-store";
import { getBrainForActor } from "@/lib/adams-brain/access";
import { COLLECTIONS } from "@/lib/schema";
import {
  brainSourcePatchSchema,
  type BrainChunkDoc,
  type BrainSourceDoc,
} from "@/lib/adams-harness/types";

type Ctx = { params: Promise<{ id: string; sourceId: string }> };

async function loadSource(brainId: string, sourceId: string) {
  const snap = await getDb()
    .collection(COLLECTIONS.BRAIN_SOURCES)
    .doc(sourceId)
    .get();
  if (!snap.exists) throw new HttpError(404, "Source not found");
  const source = { id: snap.id, ...snap.data() } as BrainSourceDoc;
  if (source.brainId !== brainId) throw new HttpError(404, "Source not found");
  return source;
}

function safeSource(source: BrainSourceDoc) {
  const safe: Partial<BrainSourceDoc> = { ...source };
  delete safe.storagePath;
  return serializeDoc(safe);
}

export async function GET(request: NextRequest, { params }: Ctx) {
  try {
    const actor = await requireUser(request);
    const { id, sourceId } = await params;
    const { brain } = await getBrainForActor(actor, id);
    const source = await loadSource(brain.id, sourceId);
    const url = new URL(request.url);
    let chunks: unknown[] = [];
    if (url.searchParams.get("chunks") === "1") {
      const snap = await getDb()
        .collection(COLLECTIONS.BRAIN_CHUNKS)
        .where("sourceId", "==", source.id)
        .limit(250)
        .get();
      chunks = snap.docs
        .map((d) => d.data() as BrainChunkDoc)
        .sort((a, b) => a.ordinal - b.ordinal)
        .slice(0, 50)
        .map((c) => ({ id: c.id, ordinal: c.ordinal, text: c.text.slice(0, 800) }));
    }
    return Response.json({ source: safeSource(source), chunks });
  } catch (error) {
    if (error instanceof ApiAuthError) return authErrorResponse(error);
    const http = httpErrorResponse(error);
    if (http) return http;
    console.error("Brain source get error:", error);
    return Response.json({ error: "Failed to load source." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: Ctx) {
  try {
    const actor = await requireUser(request);
    const { id, sourceId } = await params;
    const { brain, canManage } = await getBrainForActor(actor, id);
    if (!canManage) {
      throw new HttpError(403, "Not authorized to manage this brain");
    }
    const parsed = brainSourcePatchSchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new HttpError(400, "Invalid source patch");
    }
    const source = await loadSource(brain.id, sourceId);
    const next = parsed.data.status;
    if (next === "ready" && source.status !== "retired") {
      throw new HttpError(
        400,
        "Only retired sources can be restored; failed or processing sources must be re-uploaded",
      );
    }
    if (next === "ready" && source.chunkCount <= 0) {
      throw new HttpError(400, "Source has no ingested chunks");
    }
    if (next === source.status) {
      return Response.json({ source: safeSource(source) });
    }
    const db = getDb();
    const batch = db.batch();
    const now = new Date() as unknown as BrainSourceDoc["updatedAt"];
    batch.update(db.collection(COLLECTIONS.BRAIN_SOURCES).doc(source.id), {
      status: next,
      updatedAt: now,
    });
    if (next === "ready") {
      const others = await db
        .collection(COLLECTIONS.BRAIN_SOURCES)
        .where("brainId", "==", brain.id)
        .where("logicalKey", "==", source.logicalKey)
        .where("status", "==", "ready")
        .limit(50)
        .get();
      for (const doc of others.docs) {
        if (doc.id !== source.id) {
          batch.update(doc.ref, { status: "retired", updatedAt: now });
        }
      }
    }
    await batch.commit();
    await writeAuditLog({
      entityType: "brain_source",
      entityId: source.id,
      action: `status_${next}`,
      actorUid: actor.uid,
      actorName: actor.email,
      actorRole: actor.role,
      detail: { brainId: brain.id, version: source.version },
    });
    return Response.json({
      source: safeSource({ ...source, status: next }),
    });
  } catch (error) {
    if (error instanceof ApiAuthError) return authErrorResponse(error);
    const http = httpErrorResponse(error);
    if (http) return http;
    console.error("Brain source update error:", error);
    return Response.json({ error: "Failed to update source." }, { status: 500 });
  }
}
