import { NextRequest } from "next/server";
import {
  authErrorResponse,
  requireUser,
  ApiAuthError,
} from "@/lib/auth/server-auth";
import {
  getDb,
  httpErrorResponse,
  serializeDoc,
} from "@/lib/adams-harness/server-store";
import { getBrainForActor } from "@/lib/adams-brain/access";
import { COLLECTIONS } from "@/lib/schema";
import type { BrainQueryDoc } from "@/lib/adams-harness/types";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Ctx) {
  try {
    const actor = await requireUser(request);
    const { id } = await params;
    const { brain } = await getBrainForActor(actor, id);
    const snap = await getDb()
      .collection(COLLECTIONS.BRAIN_QUERIES)
      .where("brainId", "==", brain.id)
      .where("actorUid", "==", actor.uid)
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();
    const queries = snap.docs.map((d) => {
      const q = { id: d.id, ...d.data() } as BrainQueryDoc;
      return serializeDoc({
        id: q.id,
        question: q.question,
        answer: q.answer,
        citationIds: q.citationIds,
        createdAt: q.createdAt,
      });
    });
    return Response.json({ queries });
  } catch (error) {
    if (error instanceof ApiAuthError) return authErrorResponse(error);
    const http = httpErrorResponse(error);
    if (http) return http;
    console.error("Brain queries error:", error);
    return Response.json({ error: "Failed to load queries." }, { status: 500 });
  }
}
