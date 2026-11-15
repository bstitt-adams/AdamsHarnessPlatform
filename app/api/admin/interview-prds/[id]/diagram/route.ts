import { NextRequest, NextResponse } from "next/server";
import { authErrorResponse, requireAdmin } from "@/lib/auth/server-auth";
import { getDb, httpErrorResponse } from "@/lib/adams-harness/server-store";
import { generatePrdSystemDiagram } from "@/lib/adams-harness/prd-collaboration";
import type { InterviewPrdDoc } from "@/lib/adams-harness/types";
import { HermesError } from "@/lib/hermes/client";
import { COLLECTIONS } from "@/lib/schema";

/** POST — generate (or regenerate) the platform-fit system diagram for a PRD. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireAdmin(request);
    const { id } = await params;
    const ref = getDb().collection(COLLECTIONS.INTERVIEW_PRDS).doc(id);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ error: "PRD not found" }, { status: 404 });
    const prd = { id: snap.id, ...snap.data() } as InterviewPrdDoc;

    let systemDiagram;
    try {
      systemDiagram = await generatePrdSystemDiagram({ prd, actorEmail: actor.email });
    } catch (error) {
      if (error instanceof HermesError) {
        return NextResponse.json({ error: `AI assistant unavailable: ${error.message}` }, { status: 502 });
      }
      throw error;
    }
    await ref.update({ systemDiagram, updatedAt: new Date() });
    return NextResponse.json({ systemDiagram });
  } catch (error) {
    const authError = authErrorResponse(error);
    if (authError) return authError;
    const http = httpErrorResponse(error);
    if (http) return http;
    console.error("PRD diagram error:", error);
    return NextResponse.json({ error: "Failed to generate system diagram" }, { status: 500 });
  }
}
