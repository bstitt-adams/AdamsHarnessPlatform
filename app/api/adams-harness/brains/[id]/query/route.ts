import { NextRequest } from "next/server";
import {
  authErrorResponse,
  requireUser,
  ApiAuthError,
} from "@/lib/auth/server-auth";
import {
  getDb,
  HttpError,
  httpErrorResponse,
  writeAuditLog,
} from "@/lib/adams-harness/server-store";
import { getBrainForActor } from "@/lib/adams-brain/access";
import { answerBrainQuestion } from "@/lib/adams-brain/retrieval";
import { COLLECTIONS } from "@/lib/schema";
import {
  brainQueryInputSchema,
  type BrainQueryDoc,
} from "@/lib/adams-harness/types";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Ctx) {
  try {
    const actor = await requireUser(request);
    const { id } = await params;
    const { brain, canQuery } = await getBrainForActor(actor, id);
    if (!canQuery) {
      throw new HttpError(403, "Not authorized to query this brain");
    }
    const parsed = brainQueryInputSchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new HttpError(400, "Invalid question");
    }
    const result = await answerBrainQuestion(
      brain.id,
      brain.departmentId,
      parsed.data.question,
    );

    const ref = getDb().collection(COLLECTIONS.BRAIN_QUERIES).doc();
    const now = new Date() as unknown as BrainQueryDoc["createdAt"];
    await ref.set({
      id: ref.id,
      brainId: brain.id,
      departmentId: brain.departmentId,
      actorUid: actor.uid,
      question: parsed.data.question.slice(0, 4000),
      answer: result.answer.slice(0, 20000),
      citationIds: result.citations.map((c) => c.id),
      ...(result.model ? { model: result.model } : {}),
      createdAt: now,
    } satisfies BrainQueryDoc);
    await writeAuditLog({
      entityType: "brain_query",
      entityId: ref.id,
      action: "query",
      actorUid: actor.uid,
      actorName: actor.email,
      actorRole: actor.role,
      detail: { brainId: brain.id, citations: result.citations.length },
    });
    return Response.json({
      id: ref.id,
      answer: result.answer,
      citations: result.citations,
      insufficientEvidence: result.insufficientEvidence,
    });
  } catch (error) {
    if (error instanceof ApiAuthError) return authErrorResponse(error);
    const http = httpErrorResponse(error);
    if (http) return http;
    console.error("Brain query error:", error);
    return Response.json({ error: "Query failed." }, { status: 500 });
  }
}
