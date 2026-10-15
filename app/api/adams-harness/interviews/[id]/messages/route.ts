import { NextRequest, NextResponse } from "next/server";
import { requireUser, authErrorResponse, ApiAuthError } from "@/lib/auth/server-auth";
import {
  postInterviewMessageSchema,
  type DepartmentDoc,
  type ProcessInterviewDoc,
} from "@/lib/adams-harness/types";
import { newMessage, runInterviewTurn } from "@/lib/adams-harness/interview";
import {
  canAccessInterview,
  getDb,
  interviewCapabilities,
  serializeDoc,
} from "@/lib/adams-harness/server-store";
import { HermesError } from "@/lib/hermes/client";
import { COLLECTIONS } from "@/lib/schema";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireUser(request);
    const { id } = await params;
    const parsed = postInterviewMessageSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid message" }, { status: 400 });
    }

    const db = getDb();
    const ref = db.collection(COLLECTIONS.PROCESS_INTERVIEWS).doc(id);

    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 });
    }
    const interview = { id: snap.id, ...snap.data() } as ProcessInterviewDoc;

    const deptSnap = await db
      .collection(COLLECTIONS.DEPARTMENTS)
      .doc(interview.departmentId)
      .get();
    const department = deptSnap.exists
      ? ({ id: deptSnap.id, ...deptSnap.data() } as DepartmentDoc)
      : null;

    if (!canAccessInterview(actor, interview, department)) {
      throw new ApiAuthError(403, "Not authorized for this interview");
    }
    if (!interviewCapabilities(actor, interview, department).canRevise) {
      throw new ApiAuthError(403, "Only the interview owner or a department owner can reply");
    }
    if (interview.status === "completed") {
      return NextResponse.json(
        { error: "Interview is completed" },
        { status: 400 },
      );
    }

    const userMessage = newMessage("user", parsed.data.content);
    const working: ProcessInterviewDoc = {
      ...interview,
      messages: [...interview.messages, userMessage],
    };

    let turn;
    try {
      turn = await runInterviewTurn(working);
    } catch (error) {
      if (error instanceof HermesError) {
        return NextResponse.json(
          { error: "Interview assistant is unavailable" },
          { status: 502 },
        );
      }
      throw error;
    }

    const updatedFields = {
      messages: [...working.messages, turn.assistantMessage],
      facts: turn.facts,
      coverage: turn.coverage,
      unresolvedQuestions: turn.unresolvedQuestions,
      readyForSpecification: turn.readyForSpecification,
      status: (turn.readyForSpecification
        ? "ready_for_review"
        : "interviewing") as ProcessInterviewDoc["status"],
      model: turn.model,
      updatedAt: new Date(),
    };

    await db.runTransaction(async (tx) => {
      const fresh = await tx.get(ref);
      if (!fresh.exists) throw new ApiAuthError(403, "Interview not found");
      const freshData = fresh.data() as ProcessInterviewDoc;
      const expectedLen = interview.messages.length;
      if (freshData.messages.length !== expectedLen) {
        throw new ConcurrentInterviewError();
      }
      tx.update(ref, updatedFields);
    });

    const updated = (await ref.get()).data() as ProcessInterviewDoc;
    return NextResponse.json({
      interview: serializeDoc({ ...updated, id: ref.id }),
      userMessage,
      assistantMessage: turn.assistantMessage,
    });
  } catch (error) {
    const authError = authErrorResponse(error);
    if (authError) return authError;
    if (error instanceof ConcurrentInterviewError) {
      return NextResponse.json(
        { error: "Interview was updated concurrently; retry" },
        { status: 409 },
      );
    }
    console.error("Interview message POST error:", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}

class ConcurrentInterviewError extends Error {}
