import { NextRequest, NextResponse } from "next/server";
import { ApiAuthError, authErrorResponse, requireUser } from "@/lib/auth/server-auth";
import { adminDb } from "@/lib/firebase-admin";
import { httpErrorResponse } from "@/lib/adams-harness/server-store";
import { isSafetyActor } from "@/lib/safety/access";
import { COLLECTIONS, type SafetyRequestDoc } from "@/lib/schema";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { z } from "zod";

const patchSchema = z.object({
  status: z.enum(["open", "triaged", "in_progress", "resolved", "closed"]).optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
  triageNotes: z.string().max(2000).optional(),
  photoPaths: z.array(z.string()).max(10).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireUser(request);
    if (!adminDb) return NextResponse.json({ error: "Database service unavailable" }, { status: 503 });
    const { id } = await params;
    const parsed = patchSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
    }
    const body = parsed.data;

    const ref = adminDb.collection(COLLECTIONS.SAFETY_REQUESTS).doc(id);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ error: "Request not found" }, { status: 404 });
    const existing = snap.data() as SafetyRequestDoc;

    const safety = await isSafetyActor(actor);
    const isOwner = existing.submittedByUid === actor.uid;

    // Triage fields require Safety access; owners may only attach photos while open.
    if (body.status || body.priority || body.triageNotes !== undefined) {
      if (!safety) return NextResponse.json({ error: "Safety personnel access required" }, { status: 403 });
    }
    if (body.photoPaths && (!isOwner || existing.status !== "open")) {
      return NextResponse.json({ error: "Photos can only be added to your own open request" }, { status: 403 });
    }

    const updates: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
    if (body.status) {
      updates.status = body.status;
      if (body.status === "resolved" || body.status === "closed") {
        updates.resolvedAt = Timestamp.now();
        updates.resolvedByEmail = actor.email;
      }
    }
    if (body.priority) updates.priority = body.priority;
    if (body.triageNotes !== undefined) updates.triageNotes = body.triageNotes;
    if (body.photoPaths) updates.photoPaths = body.photoPaths;

    await ref.update(updates);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ApiAuthError) return authErrorResponse(error);
    const http = httpErrorResponse(error);
    if (http) return http;
    console.error("Safety request update failed:", error);
    return NextResponse.json({ error: "Failed to update safety request" }, { status: 500 });
  }
}
