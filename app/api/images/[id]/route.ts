import { NextRequest, NextResponse } from "next/server";
import {
  authErrorResponse,
  requireAdmin,
} from "@/lib/auth/server-auth";
import {
  getDb,
  httpErrorResponse,
  serializeDoc,
} from "@/lib/adams-harness/server-store";
import { COLLECTIONS } from "@/lib/schema";
import type { ImageDoc } from "@/lib/firebase-images";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const snap = await getDb().collection(COLLECTIONS.IMAGES).doc(id).get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    const image = { id: snap.id, ...snap.data() } as ImageDoc;
    if (!image.isActive) {
      await requireAdmin(request);
    }

    return NextResponse.json({ image: serializeDoc(image) });
  } catch (error) {
    const authError = authErrorResponse(error);
    if (authError) return authError;
    const httpError = httpErrorResponse(error);
    if (httpError) return httpError;
    console.error("Image GET error:", error);
    return NextResponse.json({ error: "Failed to load image" }, { status: 500 });
  }
}
