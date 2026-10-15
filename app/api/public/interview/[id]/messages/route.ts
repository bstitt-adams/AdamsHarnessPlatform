import { NextRequest, NextResponse } from "next/server";
import {
  postInterviewMessageSchema,
  type ProcessInterviewDoc,
} from "@/lib/adams-harness/types";
import { newMessage, runInterviewTurn } from "@/lib/adams-harness/interview";
import { isRateLimited } from "@/lib/adams-harness/rate-limit";
import {
  getDb,
  httpErrorResponse,
  HttpError,
  serializeDoc,
} from "@/lib/adams-harness/server-store";
import { HermesError } from "@/lib/hermes/client";
import { COLLECTIONS } from "@/lib/schema";

function clientKey(request: NextRequest): string {
  const fwd = request.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || "anonymous";
}

/** POST — continue a public interview. Only interviews created through the public flow can be reached here. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (isRateLimited(`pub-interview:${clientKey(request)}`, 40, 60_000)) {
      throw new HttpError(429, "Too many requests. Please try again shortly.");
    }
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

    if (
      interview.source !== "public" ||
      request.cookies.get(`adams-interview-${id}`)?.value !== interview.publicSessionToken
    ) {
      return NextResponse.json({ error: "Not authorized for this interview" }, { status: 403 });
    }
    if (interview.status === "completed") {
      return NextResponse.json({ error: "Interview is completed" }, { status: 400 });
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
      if (!fresh.exists) throw new HttpError(404, "Interview not found");
      const freshData = fresh.data() as ProcessInterviewDoc;
      if (freshData.messages.length !== interview.messages.length) {
        throw new HttpError(409, "Interview was updated concurrently; retry");
      }
      tx.update(ref, updatedFields);
    });

    const updated = (await ref.get()).data() as ProcessInterviewDoc;
    return NextResponse.json({
      interview: serializeDoc({ ...updated, id: ref.id }),
      assistantMessage: turn.assistantMessage,
    });
  } catch (error) {
    const httpError = httpErrorResponse(error);
    if (httpError) return httpError;
    console.error("Public interview message POST error:", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
