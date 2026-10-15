import { NextRequest } from "next/server";
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
} from "@/lib/adams-harness/server-store";
import { getBrainForActor } from "@/lib/adams-brain/access";
import { sanitizeFileName } from "@/lib/adams-brain/ingestion";
import { COLLECTIONS } from "@/lib/schema";
import type { BrainSourceDoc } from "@/lib/adams-harness/types";

type Ctx = { params: Promise<{ id: string; sourceId: string }> };

export async function GET(request: NextRequest, { params }: Ctx) {
  try {
    const actor = await requireUser(request);
    const { id, sourceId } = await params;
    const { brain } = await getBrainForActor(actor, id);
    if (!adminStorage) {
      throw new HttpError(503, "Storage service unavailable");
    }
    const snap = await getDb()
      .collection(COLLECTIONS.BRAIN_SOURCES)
      .doc(sourceId)
      .get();
    if (!snap.exists) throw new HttpError(404, "Source not found");
    const source = { id: snap.id, ...snap.data() } as BrainSourceDoc;
    if (source.brainId !== brain.id || source.type !== "upload" || !source.storagePath) {
      throw new HttpError(404, "Source not found");
    }
    const [bytes] = await adminStorage
      .bucket()
      .file(source.storagePath)
      .download();
    const fileName = sanitizeFileName(source.originalName ?? source.title);
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": source.contentType ?? "application/octet-stream",
        "Content-Length": String(bytes.length),
        "Content-Disposition": `attachment; filename="${fileName.replace(/"/g, "")}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof ApiAuthError) return authErrorResponse(error);
    const http = httpErrorResponse(error);
    if (http) return http;
    console.error("Brain source download error:", error);
    return Response.json({ error: "Download failed." }, { status: 500 });
  }
}
