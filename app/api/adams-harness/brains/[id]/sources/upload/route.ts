import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import {
  authErrorResponse,
  requireUser,
  ApiAuthError,
} from "@/lib/auth/server-auth";
import { adminStorage } from "@/lib/firebase-admin";
import {
  getDb,
  HttpError,
  httpErrorResponse,
  serializeDoc,
  writeAuditLog,
} from "@/lib/adams-harness/server-store";
import { getBrainForActor } from "@/lib/adams-brain/access";
import {
  MAX_FILE_BYTES,
  classifyUpload,
  extractText,
  ingestSource,
  logicalKeyFor,
  findSourceByLogicalKey,
  nextSourceVersion,
  sanitizeFileName,
  sha256Hex,
} from "@/lib/adams-brain/ingestion";
import { COLLECTIONS } from "@/lib/schema";
import type { BrainSourceDoc } from "@/lib/adams-harness/types";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Ctx) {
  try {
    const actor = await requireUser(request);
    const { id } = await params;
    const { brain, canManage } = await getBrainForActor(actor, id);
    if (!canManage) {
      throw new HttpError(403, "Not authorized to manage this brain");
    }
    if (!adminStorage) {
      throw new HttpError(503, "Storage service unavailable");
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || typeof file === "string") {
      throw new HttpError(400, "Missing file");
    }
    const blob = file as File;
    if (blob.size <= 0 || blob.size > MAX_FILE_BYTES) {
      throw new HttpError(400, "File must be under 10MB");
    }
    const title =
      (typeof formData.get("title") === "string"
        ? (formData.get("title") as string).trim().slice(0, 300)
        : "") ||
      (typeof blob.name === "string" ? blob.name.slice(0, 300) : "upload");
    const originalName =
      typeof blob.name === "string" ? blob.name.slice(0, 300) : title;
    const kind = classifyUpload(blob.type ?? "", originalName);
    const buffer = Buffer.from(await blob.arrayBuffer());
    const checksum = sha256Hex(buffer);
    const logicalKey = logicalKeyFor(brain.id, title);

    const existing = await findSourceByLogicalKey(brain.id, logicalKey);
    const active = existing.find(
      (s) => s.status === "ready" || s.status === "processing",
    );
    if (active && active.checksum === checksum) {
      const safe: Partial<BrainSourceDoc> = { ...active };
      delete safe.storagePath;
      return Response.json({ source: serializeDoc(safe) });
    }

    const sourceId = randomUUID();
    const version = await nextSourceVersion(brain.id, logicalKey);
    const storagePath = `adams-brains/${brain.departmentId}/${brain.id}/${sourceId}/${sanitizeFileName(originalName)}`;
    const fileRef = adminStorage.bucket().file(storagePath);
    await fileRef.save(buffer, {
      contentType: blob.type || "application/octet-stream",
      metadata: {
        metadata: {
          brainId: brain.id,
          departmentId: brain.departmentId,
          uploadedByUid: actor.uid,
        },
      },
    });

    const db = getDb();
    const ref = db.collection(COLLECTIONS.BRAIN_SOURCES).doc(sourceId);
    const now = new Date() as unknown as BrainSourceDoc["createdAt"];
    const source: BrainSourceDoc = {
      id: sourceId,
      brainId: brain.id,
      departmentId: brain.departmentId,
      type: "upload",
      title,
      logicalKey,
      version,
      status: "processing",
      checksum,
      storagePath,
      contentType: blob.type || "application/octet-stream",
      originalName,
      textLength: 0,
      chunkCount: 0,
      createdByUid: actor.uid,
      createdAt: now,
      updatedAt: now,
    };
    try {
      await ref.set(source);
    } catch (error) {
      await fileRef.delete().catch(() => {});
      throw error;
    }
    try {
      const text = await extractText(buffer, kind);
      await ingestSource(source, text);
    } catch (error) {
      throw error instanceof HttpError
        ? error
        : new HttpError(400, "Could not extract readable text from file");
    }
    const fresh = (await ref.get()).data() as BrainSourceDoc;
    await writeAuditLog({
      entityType: "brain_source",
      entityId: sourceId,
      action: "upload_ingest",
      actorUid: actor.uid,
      actorName: actor.email,
      actorRole: actor.role,
      detail: { brainId: brain.id, version, chunkCount: fresh.chunkCount },
    });
    const safe: Partial<BrainSourceDoc> = { ...fresh };
    delete safe.storagePath;
    return Response.json({ source: serializeDoc(safe) }, { status: 201 });
  } catch (error) {
    if (error instanceof ApiAuthError) return authErrorResponse(error);
    const http = httpErrorResponse(error);
    if (http) return http;
    console.error("Brain source upload error:", error);
    return Response.json({ error: "Upload failed." }, { status: 500 });
  }
}
