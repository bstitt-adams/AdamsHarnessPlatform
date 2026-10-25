import { NextRequest, NextResponse } from "next/server";
import {
  authErrorResponse,
  requireAdmin,
} from "@/lib/auth/server-auth";
import {
  generateInterviewPrdSchema,
  type DepartmentDoc,
  type ProcessInterviewDoc,
} from "@/lib/adams-harness/types";
import {
  createInterviewPrd,
  listInterviewPrds,
  serializeInterviewPrd,
} from "@/lib/adams-harness/interview-prds";
import {
  getDb,
  httpErrorResponse,
  serializeDoc,
} from "@/lib/adams-harness/server-store";
import { COLLECTIONS } from "@/lib/schema";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const db = getDb();
    const [interviewsSnap, departmentsSnap, prds] = await Promise.all([
      db.collection(COLLECTIONS.PROCESS_INTERVIEWS).get(),
      db.collection(COLLECTIONS.DEPARTMENTS).get(),
      listInterviewPrds(),
    ]);
    const interviews = interviewsSnap.docs
      .map((docSnap) => {
        const interview = { id: docSnap.id, ...docSnap.data() } as ProcessInterviewDoc;
        const safeInterview = { ...interview };
        delete safeInterview.publicSessionToken;
        return safeInterview;
      })
      .sort((a, b) => (b.updatedAt?.toMillis?.() ?? 0) - (a.updatedAt?.toMillis?.() ?? 0));
    const departments = departmentsSnap.docs.map(
      (docSnap) => ({ id: docSnap.id, ...docSnap.data() }) as DepartmentDoc,
    );
    const latestByInterview = new Map<string, (typeof prds)[number]>();
    for (const prd of prds) {
      const existing = latestByInterview.get(prd.interviewId);
      if (!existing || prd.version > existing.version) latestByInterview.set(prd.interviewId, prd);
    }
    return NextResponse.json({
      interviews: interviews.map(serializeDoc),
      departments: departments.map(serializeDoc),
      prds: prds.map(serializeInterviewPrd),
      latestPrds: Object.fromEntries(
        Array.from(latestByInterview.entries()).map(([id, prd]) => [
          id,
          serializeInterviewPrd(prd),
        ]),
      ),
    });
  } catch (error) {
    const authError = authErrorResponse(error);
    if (authError) return authError;
    console.error("Admin interview PRD GET error:", error);
    return NextResponse.json(
      {
        error: "Failed to load interview PRDs",
        detail:
          process.env.NODE_ENV === "development"
            ? error instanceof Error
              ? error.message
              : String(error)
            : undefined,
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireAdmin(request);
    const parsed = generateInterviewPrdSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid PRD generation request" }, { status: 400 });
    }
    const prd = await createInterviewPrd({
      interviewId: parsed.data.interviewId,
      actor,
      adminContext: parsed.data.adminContext,
    });
    return NextResponse.json({ prd: serializeInterviewPrd(prd) }, { status: 201 });
  } catch (error) {
    const authError = authErrorResponse(error);
    if (authError) return authError;
    const httpError = httpErrorResponse(error);
    if (httpError) return httpError;
    console.error("Admin interview PRD POST error:", error);
    return NextResponse.json({ error: "Failed to generate interview PRD" }, { status: 500 });
  }
}
