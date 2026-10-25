import { NextRequest, NextResponse } from "next/server";
import {
  authErrorResponse,
  requireAdmin,
} from "@/lib/auth/server-auth";
import {
  patchInterviewPrdSchema,
  type InterviewPrdDoc,
} from "@/lib/adams-harness/types";
import {
  getDb,
  httpErrorResponse,
  HttpError,
  serializeDoc,
  writeAuditLog,
} from "@/lib/adams-harness/server-store";
import { COLLECTIONS } from "@/lib/schema";
import { prdHash } from "@/lib/adams-harness/interview-prds";

type Ctx = { params: Promise<{ id: string }> };

async function loadPrd(id: string) {
  const snap = await getDb().collection(COLLECTIONS.INTERVIEW_PRDS).doc(id).get();
  return snap.exists ? ({ id: snap.id, ...snap.data() } as InterviewPrdDoc) : null;
}

export async function GET(request: NextRequest, { params }: Ctx) {
  try {
    await requireAdmin(request);
    const { id } = await params;
    const prd = await loadPrd(id);
    if (!prd) return NextResponse.json({ error: "PRD not found" }, { status: 404 });
    return NextResponse.json({ prd: serializeDoc(prd) });
  } catch (error) {
    const authError = authErrorResponse(error);
    if (authError) return authError;
    console.error("Admin interview PRD GET error:", error);
    return NextResponse.json({ error: "Failed to load PRD" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: Ctx) {
  try {
    const actor = await requireAdmin(request);
    const { id } = await params;
    const parsed = patchInterviewPrdSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid PRD update" }, { status: 400 });
    }
    const existing = await loadPrd(id);
    if (!existing) throw new HttpError(404, "PRD not found.");
    if (existing.status === "deployed") {
      throw new HttpError(409, "Deployed PRDs are immutable.");
    }
    if (parsed.data.status === "staged" && existing.status === "archived") {
      throw new HttpError(409, "Archived PRDs cannot be staged.");
    }
    const hasContextEdit =
      parsed.data.content !== undefined ||
      parsed.data.title !== undefined ||
      parsed.data.adminNotes !== undefined;
    if (parsed.data.status === "staged" && (existing.requiresRegeneration || hasContextEdit)) {
      throw new HttpError(
        409,
        "Regenerate the PRD before staging so manual edits are incorporated into the deployable specification.",
      );
    }
    const nextContent = parsed.data.content ?? existing.content;
    const updates = {
      ...parsed.data,
      ...(hasContextEdit ? { requiresRegeneration: true } : {}),
      ...(parsed.data.content || parsed.data.title
        ? {
            canonicalHash: prdHash({
              interviewId: existing.interviewId,
              version: existing.version,
              content: nextContent,
              sections: existing.sections,
            }),
          }
        : {}),
      updatedAt: new Date(),
    };
    await getDb().collection(COLLECTIONS.INTERVIEW_PRDS).doc(id).update(updates);
    await writeAuditLog({
      entityType: "interview_prd",
      entityId: id,
      action: parsed.data.status === "staged" ? "stage" : "update",
      actorUid: actor.uid,
      actorName: actor.email,
      actorRole: actor.role,
      detail: {
        interviewId: existing.interviewId,
        version: existing.version,
        status: parsed.data.status || existing.status,
      },
    });
    const updated = await loadPrd(id);
    return NextResponse.json({ prd: serializeDoc(updated!) });
  } catch (error) {
    const authError = authErrorResponse(error);
    if (authError) return authError;
    const httpError = httpErrorResponse(error);
    if (httpError) return httpError;
    console.error("Admin interview PRD PATCH error:", error);
    return NextResponse.json({ error: "Failed to update PRD" }, { status: 500 });
  }
}
