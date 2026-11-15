import { NextRequest, NextResponse } from "next/server";
import { ApiAuthError, authErrorResponse, requireUser } from "@/lib/auth/server-auth";
import { adminDb } from "@/lib/firebase-admin";
import { httpErrorResponse } from "@/lib/adams-harness/server-store";
import { isSafetyActor } from "@/lib/safety/access";
import { COLLECTIONS, type SafetyRequestDoc, type TeamMemberDoc } from "@/lib/schema";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { z } from "zod";

const createSchema = z.object({
  type: z.enum(["request", "observation", "near_miss", "hazard"]),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(5000),
  jobsite: z.string().max(200).optional(),
  anonymous: z.boolean().optional(),
  photoPaths: z.array(z.string()).max(10).optional(),
});

function redact(doc: SafetyRequestDoc): SafetyRequestDoc {
  if (!doc.anonymous) return doc;
  const { submittedByUid, submittedByName, ...rest } = doc;
  void submittedByUid;
  void submittedByName;
  return { ...rest, submittedByName: "Anonymous" } as SafetyRequestDoc;
}

/** Create a safety request (any signed-in user). */
export async function POST(request: NextRequest) {
  try {
    const actor = await requireUser(request);
    if (!adminDb) return NextResponse.json({ error: "Database service unavailable" }, { status: 503 });
    const parsed = createSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
    }
    const body = parsed.data;

    let submittedByName = actor.email;
    if (actor.teamMemberId) {
      const memberSnap = await adminDb.collection(COLLECTIONS.TEAM_MEMBERS).doc(actor.teamMemberId).get();
      if (memberSnap.exists) {
        const member = memberSnap.data() as TeamMemberDoc;
        submittedByName = `${member.firstName} ${member.lastName}`.trim() || actor.email;
      }
    }

    const ref = adminDb.collection(COLLECTIONS.SAFETY_REQUESTS).doc();
    const doc: Omit<SafetyRequestDoc, "createdAt" | "updatedAt"> & { createdAt: FieldValue; updatedAt: FieldValue } = {
      id: ref.id,
      type: body.type,
      title: body.title,
      description: body.description,
      ...(body.jobsite ? { jobsite: body.jobsite } : {}),
      anonymous: body.anonymous === true,
      submittedByUid: actor.uid,
      submittedByName,
      photoPaths: body.photoPaths || [],
      status: "open",
      priority: "normal",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };
    await ref.set(doc);
    return NextResponse.json({ id: ref.id });
  } catch (error) {
    if (error instanceof ApiAuthError) return authErrorResponse(error);
    const http = httpErrorResponse(error);
    if (http) return http;
    console.error("Safety request create failed:", error);
    return NextResponse.json({ error: "Failed to submit safety request" }, { status: 500 });
  }
}

/** List safety requests: Safety personnel see all, others see their own. */
export async function GET(request: NextRequest) {
  try {
    const actor = await requireUser(request);
    if (!adminDb) return NextResponse.json({ error: "Database service unavailable" }, { status: 503 });
    const safety = await isSafetyActor(actor);

    const collection = adminDb.collection(COLLECTIONS.SAFETY_REQUESTS);
    const snap = safety
      ? await collection.orderBy("createdAt", "desc").limit(300).get()
      : await collection.where("submittedByUid", "==", actor.uid).orderBy("createdAt", "desc").limit(100).get();

    const requests = snap.docs.map((d) => {
      const data = { id: d.id, ...d.data() } as SafetyRequestDoc;
      return safety || !data.anonymous ? data : redact(data);
    });
    return NextResponse.json({ requests, safety });
  } catch (error) {
    if (error instanceof ApiAuthError) return authErrorResponse(error);
    const http = httpErrorResponse(error);
    if (http) return http;
    console.error("Safety request list failed:", error);
    return NextResponse.json({ error: "Failed to load safety requests" }, { status: 500 });
  }
}
