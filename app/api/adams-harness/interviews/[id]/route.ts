import { NextRequest, NextResponse } from "next/server";
import { requireUser, authErrorResponse, ApiAuthError } from "@/lib/auth/server-auth";
import {
  patchInterviewSchema,
  type DepartmentDoc,
  type ProcessInterviewDoc,
} from "@/lib/adams-harness/types";
import {
  canAccessInterview,
  getDb,
  interviewCapabilities,
  serializeDoc,
} from "@/lib/adams-harness/server-store";
import { COLLECTIONS } from "@/lib/schema";

async function loadInterviewAndDepartment(db: FirebaseFirestore.Firestore, id: string) {
  const snap = await db.collection(COLLECTIONS.PROCESS_INTERVIEWS).doc(id).get();
  if (!snap.exists) return { interview: null, department: null };
  const interview = { id: snap.id, ...snap.data() } as ProcessInterviewDoc;
  const deptSnap = await db
    .collection(COLLECTIONS.DEPARTMENTS)
    .doc(interview.departmentId)
    .get();
  const department = deptSnap.exists
    ? ({ id: deptSnap.id, ...deptSnap.data() } as DepartmentDoc)
    : null;
  return { interview, department };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireUser(request);
    const { id } = await params;
    const db = getDb();
    const { interview, department } = await loadInterviewAndDepartment(db, id);
    if (!interview) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 });
    }
    if (!canAccessInterview(actor, interview, department)) {
      throw new ApiAuthError(403, "Not authorized for this interview");
    }
    return NextResponse.json({
      interview: serializeDoc(interview),
      department: department ? serializeDoc(department) : null,
      capabilities: interviewCapabilities(actor, interview, department),
    });
  } catch (error) {
    const authError = authErrorResponse(error);
    if (authError) return authError;
    console.error("Interview GET error:", error);
    return NextResponse.json({ error: "Failed to load interview" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireUser(request);
    const { id } = await params;
    const parsed = patchInterviewSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid interview update" }, { status: 400 });
    }

    const db = getDb();
    const { interview, department } = await loadInterviewAndDepartment(db, id);
    if (!interview) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 });
    }
    if (!canAccessInterview(actor, interview, department)) {
      throw new ApiAuthError(403, "Not authorized for this interview");
    }
    if (!interviewCapabilities(actor, interview, department).canRevise) {
      throw new ApiAuthError(403, "Only the interview owner or a department owner can edit");
    }
    if (parsed.data.status && interview.readyForSpecification) {
      return NextResponse.json(
        { error: "Cannot revert status once ready for review" },
        { status: 400 },
      );
    }

    const ref = db.collection(COLLECTIONS.PROCESS_INTERVIEWS).doc(id);
    await ref.update({ ...parsed.data, updatedAt: new Date() });
    const updated = (await ref.get()).data() as ProcessInterviewDoc;
    return NextResponse.json({ interview: serializeDoc(updated) });
  } catch (error) {
    const authError = authErrorResponse(error);
    if (authError) return authError;
    console.error("Interview PATCH error:", error);
    return NextResponse.json({ error: "Failed to update interview" }, { status: 500 });
  }
}
