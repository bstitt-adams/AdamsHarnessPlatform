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

export async function GET(request: NextRequest) {
  try {
    const includeInactive = request.nextUrl.searchParams.get("includeInactive") === "true";
    if (includeInactive) {
      await requireAdmin(request);
    }

    const category = request.nextUrl.searchParams.get("category");
    const name = request.nextUrl.searchParams.get("name");
    const db = getDb();
    let queryRef = db.collection(COLLECTIONS.IMAGES).where("isActive", "==", true);
    if (includeInactive) {
      queryRef = db.collection(COLLECTIONS.IMAGES) as typeof queryRef;
    }
    if (category) {
      queryRef = queryRef.where("category", "==", category);
    }
    if (name) {
      const namedSnap = await queryRef.where("name", "==", name).limit(1).get();
      if (namedSnap.empty) {
        return NextResponse.json({ image: null });
      }
      const namedImage = { id: namedSnap.docs[0].id, ...namedSnap.docs[0].data() } as ImageDoc;
      return NextResponse.json({ image: serializeDoc(namedImage) });
    }

    const snapshot = await queryRef.get();
    const images = snapshot.docs
      .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }) as ImageDoc)
      .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0))
      .map((image) => ({
        id: image.id,
        name: image.name,
        description: image.description,
        category: image.category,
        mimeType: image.mimeType,
        width: image.width,
        height: image.height,
        size: image.size,
        createdAt: image.createdAt,
        updatedAt: image.updatedAt,
        tags: image.tags,
        isActive: image.isActive,
      }));

    return NextResponse.json({ images: images.map(serializeDoc) });
  } catch (error) {
    const authError = authErrorResponse(error);
    if (authError) return authError;
    const httpError = httpErrorResponse(error);
    if (httpError) return httpError;
    console.error("Images GET error:", error);
    return NextResponse.json({ error: "Failed to load images" }, { status: 500 });
  }
}
