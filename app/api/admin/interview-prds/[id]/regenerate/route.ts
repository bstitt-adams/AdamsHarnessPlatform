import { NextRequest, NextResponse } from "next/server";
import {
  authErrorResponse,
  requireAdmin,
} from "@/lib/auth/server-auth";
import {
  regenerateInterviewPrdSchema,
  type InterviewPrdDoc,
} from "@/lib/adams-harness/types";
import {
  createInterviewPrd,
  getLatestInterviewPrd,
  serializeInterviewPrd,
} from "@/lib/adams-harness/interview-prds";
import {
  getDb,
  httpErrorResponse,
} from "@/lib/adams-harness/server-store";
import { COLLECTIONS } from "@/lib/schema";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Ctx) {
  try {
    const actor = await requireAdmin(request);
    const { id } = await params;
    const parsed = regenerateInterviewPrdSchema.safeParse(
      await request.json().catch(() => ({})),
    );
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid regeneration request" }, { status: 400 });
    }
    const snap = await getDb().collection(COLLECTIONS.INTERVIEW_PRDS).doc(id).get();
    if (!snap.exists) {
      return NextResponse.json({ error: "PRD not found" }, { status: 404 });
    }
    const current = { id: snap.id, ...snap.data() } as InterviewPrdDoc;
    const latest = await getLatestInterviewPrd(current.interviewId);
    const prd = await createInterviewPrd({
      interviewId: current.interviewId,
      actor,
      adminContext: [
        latest?.adminNotes,
        parsed.data.instructions,
        latest && latest.id !== current.id
          ? `Regeneration requested from v${current.version}; latest context is v${latest.version}.`
          : "",
      ]
        .filter(Boolean)
        .join("\n\n"),
      previousPrd: latest,
    });
    return NextResponse.json({ prd: serializeInterviewPrd(prd) }, { status: 201 });
  } catch (error) {
    const authError = authErrorResponse(error);
    if (authError) return authError;
    const httpError = httpErrorResponse(error);
    if (httpError) return httpError;
    console.error("Admin interview PRD regenerate error:", error);
    return NextResponse.json({ error: "Failed to regenerate PRD" }, { status: 500 });
  }
}
