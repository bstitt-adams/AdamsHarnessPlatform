import { NextRequest, NextResponse } from "next/server";
import { requireUser, authErrorResponse, ApiAuthError } from "@/lib/auth/server-auth";
import {
  createInterviewSchema,
  type DepartmentDoc,
  type ProcessInterviewDoc,
} from "@/lib/adams-harness/types";
import {
  emptyCoverage,
  emptyInterviewFacts,
  runInterviewTurn,
} from "@/lib/adams-harness/interview";
import {
  canAccessDepartment,
  getDb,
  isAdminActor,
  serializeDoc,
  writeAuditLog,
} from "@/lib/adams-harness/server-store";
import { HermesError } from "@/lib/hermes/client";
import { COLLECTIONS } from "@/lib/schema";

export async function GET(request: NextRequest) {
  try {
    const actor = await requireUser(request);
    const departmentId = request.nextUrl.searchParams.get("departmentId");
    const db = getDb();

    const snapshot = await db.collection(COLLECTIONS.PROCESS_INTERVIEWS).get();
    let interviews = snapshot.docs.map(
      (d) => ({ id: d.id, ...d.data() }) as ProcessInterviewDoc,
    );

    if (departmentId) {
      interviews = interviews.filter((i) => i.departmentId === departmentId);
    }
    if (!isAdminActor(actor)) {
      interviews = interviews.filter(
        (i) =>
          i.createdByUid === actor.uid ||
          actor.departmentIds.includes(i.departmentId),
      );
    }

    interviews.sort(
      (a, b) =>
        (b.updatedAt?.toMillis?.() ?? 0) - (a.updatedAt?.toMillis?.() ?? 0),
    );
    return NextResponse.json({ interviews: interviews.map(serializeDoc) });
  } catch (error) {
    const authError = authErrorResponse(error);
    if (authError) return authError;
    console.error("Interviews GET error:", error);
    return NextResponse.json({ error: "Failed to load interviews" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireUser(request);
    const parsed = createInterviewSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid interview input" }, { status: 400 });
    }
    const { departmentId, title, task, respondentName } = parsed.data;

    const db = getDb();
    const deptSnap = await db.collection(COLLECTIONS.DEPARTMENTS).doc(departmentId).get();
    if (!deptSnap.exists) {
      return NextResponse.json({ error: "Department not found" }, { status: 404 });
    }
    const department = { id: deptSnap.id, ...deptSnap.data() } as DepartmentDoc;
    if (!department.isActive) {
      return NextResponse.json({ error: "Department is not active" }, { status: 400 });
    }
    if (!isAdminActor(actor) && !canAccessDepartment(actor, department)) {
      throw new ApiAuthError(403, "You do not belong to this department");
    }

    const ref = db.collection(COLLECTIONS.PROCESS_INTERVIEWS).doc();
    const now = new Date();
    const interview: ProcessInterviewDoc = {
      id: ref.id,
      departmentId,
      title,
      task,
      status: "interviewing",
      createdByUid: actor.uid,
      createdByTeamMemberId: actor.teamMemberId,
      createdByName: actor.email,
      respondentName: respondentName || actor.email,
      messages: [],
      facts: emptyInterviewFacts(),
      coverage: emptyCoverage(true),
      unresolvedQuestions: [],
      readyForSpecification: false,
      createdAt: now as unknown as ProcessInterviewDoc["createdAt"],
      updatedAt: now as unknown as ProcessInterviewDoc["updatedAt"],
    };

    try {
      const turn = await runInterviewTurn(interview);
      interview.messages = [turn.assistantMessage];
      interview.facts = turn.facts;
      interview.coverage = turn.coverage;
      interview.unresolvedQuestions = turn.unresolvedQuestions;
      interview.readyForSpecification = turn.readyForSpecification;
      interview.model = turn.model;
    } catch (error) {
      if (error instanceof HermesError && error.kind === "not_configured") {
        interview.status = "draft";
      } else {
        throw error;
      }
    }

    await ref.set(interview);

    await writeAuditLog({
      entityType: "interview",
      entityId: ref.id,
      action: "create",
      actorUid: actor.uid,
      actorName: actor.email,
      actorRole: actor.role,
      detail: {
        departmentId,
        title,
        respondentName: respondentName || actor.email,
      },
    });

    return NextResponse.json({ interview: serializeDoc(interview) }, { status: 201 });
  } catch (error) {
    const authError = authErrorResponse(error);
    if (authError) return authError;
    if (error instanceof HermesError) {
      return NextResponse.json(
        { error: "Interview assistant is unavailable" },
        { status: 502 },
      );
    }
    console.error("Interviews POST error:", error);
    return NextResponse.json({ error: "Failed to create interview" }, { status: 500 });
  }
}
