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
import { getAuthorizedModule } from "@/lib/modules/runtime";
import { COLLECTIONS } from "@/lib/schema";
import type { ModuleUploadDoc } from "@/lib/adams-harness/types";

type Ctx = { params: Promise<{ slug: string; id: string }> };

export async function GET(request: NextRequest, { params }: Ctx) {
  try {
    const actor = await requireUser(request);
    const { slug, id } = await params;
    const definition = await getAuthorizedModule(actor, slug);
    if (!adminStorage) {
      throw new HttpError(503, "Storage service unavailable");
    }

    const snap = await getDb()
      .collection(COLLECTIONS.MODULE_UPLOADS)
      .doc(id)
      .get();
    if (!snap.exists) {
      throw new HttpError(404, "Upload not found");
    }
    const upload = snap.data() as ModuleUploadDoc;
    if (
      upload.moduleSlug !== definition.slug ||
      upload.departmentId !== definition.departmentId
    ) {
      throw new HttpError(403, "Not authorized for this upload");
    }

    const [bytes] = await adminStorage
      .bucket()
      .file(upload.storagePath)
      .download();
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": upload.contentType,
        "Content-Length": String(bytes.length),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof ApiAuthError) return authErrorResponse(error);
    const http = httpErrorResponse(error);
    if (http) return http;
    console.error("Module upload fetch error:", error);
    return Response.json({ error: "Failed to load upload." }, { status: 500 });
  }
}
