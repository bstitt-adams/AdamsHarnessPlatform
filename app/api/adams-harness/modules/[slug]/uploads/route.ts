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
} from "@/lib/adams-harness/server-store";
import {
  getAuthorizedModule,
  assertPhotoFieldExists,
} from "@/lib/modules/runtime";
import { COLLECTIONS } from "@/lib/schema";
import type { ModuleUploadDoc } from "@/lib/adams-harness/types";

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
};
const MAX_BYTES = 10 * 1024 * 1024;

type Ctx = { params: Promise<{ slug: string }> };

export async function POST(request: NextRequest, { params }: Ctx) {
  try {
    const actor = await requireUser(request);
    const { slug } = await params;
    const definition = await getAuthorizedModule(actor, slug);
    if (!adminStorage) {
      throw new HttpError(503, "Storage service unavailable");
    }

    const formData = await request.formData();
    const fieldId = formData.get("fieldId");
    if (typeof fieldId !== "string" || !fieldId) {
      throw new HttpError(400, "Missing fieldId");
    }
    assertPhotoFieldExists(definition, fieldId);
    const file = formData.get("file");
    if (!file || typeof file === "string") {
      throw new HttpError(400, "Missing file");
    }
    const blob = file as File;
    const contentType = blob.type?.toLowerCase() ?? "";
    const ext = ALLOWED_TYPES[contentType];
    if (!ext) {
      throw new HttpError(400, "Only JPEG, PNG, WebP, or HEIC images are allowed");
    }
    if (blob.size <= 0 || blob.size > MAX_BYTES) {
      throw new HttpError(400, "File must be an image under 10MB");
    }

    const uploadId = randomUUID();
    const storagePath = `adams-modules/${definition.departmentId}/${definition.slug}/${actor.uid}/${uploadId}.${ext}`;
    const buffer = Buffer.from(await blob.arrayBuffer());
    await adminStorage.bucket().file(storagePath).save(buffer, {
      contentType,
      metadata: {
        metadata: {
          uploadedByUid: actor.uid,
          moduleSlug: definition.slug,
          departmentId: definition.departmentId,
        },
      },
    });

    const db = getDb();
    const ref = db.collection(COLLECTIONS.MODULE_UPLOADS).doc(uploadId);
    const doc: ModuleUploadDoc = {
      id: uploadId,
      departmentId: definition.departmentId,
      moduleSlug: definition.slug,
      fieldId,
      storagePath,
      originalName:
        typeof blob.name === "string" ? blob.name.slice(0, 300) : "upload",
      contentType,
      size: blob.size,
      ownerUid: actor.uid,
      createdAt: new Date() as unknown as ModuleUploadDoc["createdAt"],
    };
    await ref.set(doc);

    return Response.json({
      upload: { id: uploadId, contentType, size: blob.size },
    });
  } catch (error) {
    if (error instanceof ApiAuthError) return authErrorResponse(error);
    const http = httpErrorResponse(error);
    if (http) return http;
    console.error("Module upload error:", error);
    return Response.json({ error: "Upload failed." }, { status: 500 });
  }
}
