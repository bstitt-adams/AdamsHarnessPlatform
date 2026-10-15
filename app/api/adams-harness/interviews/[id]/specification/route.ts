import { NextRequest, NextResponse } from "next/server";
import { requireUser, authErrorResponse, ApiAuthError } from "@/lib/auth/server-auth";
import {
  type DepartmentDoc,
  type ProcessInterviewDoc,
  type SolutionSpecificationDoc,
} from "@/lib/adams-harness/types";
import {
  computeSpecificationHash,
  generateSpecificationSections,
} from "@/lib/adams-harness/specification";
import {
  canAccessInterview,
  getDb,
  httpErrorResponse,
  HttpError,
  interviewCapabilities,
  serializeDoc,
  writeAuditLog,
} from "@/lib/adams-harness/server-store";
import { HermesError } from "@/lib/hermes/client";
import { COLLECTIONS } from "@/lib/schema";

async function loadInterview(db: FirebaseFirestore.Firestore, id: string) {
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
    const { interview, department } = await loadInterview(db, id);
    if (!interview) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 });
    }
    if (!canAccessInterview(actor, interview, department)) {
      throw new ApiAuthError(403, "Not authorized for this interview");
    }

    const snapshot = await db
      .collection(COLLECTIONS.SOLUTION_SPECIFICATIONS)
      .where("interviewId", "==", id)
      .get();
    const specs = snapshot.docs
      .map((d) => ({ id: d.id, ...d.data() }) as SolutionSpecificationDoc)
      .sort((a, b) => b.version - a.version);

    return NextResponse.json({
      specifications: specs.map(serializeDoc),
      latest: specs[0] ? serializeDoc(specs[0]) : null,
      capabilities: interviewCapabilities(actor, interview, department),
    });
  } catch (error) {
    const authError = authErrorResponse(error);
    if (authError) return authError;
    const httpError = httpErrorResponse(error);
    if (httpError) return httpError;
    console.error("Specification GET error:", error);
    return NextResponse.json({ error: "Failed to load specifications" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireUser(request);
    const { id } = await params;
    const db = getDb();
    const { interview, department } = await loadInterview(db, id);
    if (!interview) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 });
    }
    if (!canAccessInterview(actor, interview, department)) {
      throw new ApiAuthError(403, "Not authorized for this interview");
    }
    if (!interviewCapabilities(actor, interview, department).canRevise) {
      throw new ApiAuthError(403, "Only the interview owner or a department owner can generate");
    }
    if (!interview.readyForSpecification) {
      return NextResponse.json(
        { error: "Interview is not ready for specification" },
        { status: 400 },
      );
    }

    const existing = await db
      .collection(COLLECTIONS.SOLUTION_SPECIFICATIONS)
      .where("interviewId", "==", id)
      .get();
    const previousLatest = existing.docs
      .map((d) => ({ id: d.id, ...d.data() }) as SolutionSpecificationDoc)
      .sort((a, b) => b.version - a.version)[0];
    const existingMaxVersion = previousLatest?.version ?? 0;

    let generated;
    try {
      generated = await generateSpecificationSections(interview);
    } catch (error) {
      if (error instanceof HermesError) {
        return NextResponse.json(
          { error: "Specification generator is unavailable" },
          { status: 502 },
        );
      }
      throw error;
    }

    const interviewRef = db.collection(COLLECTIONS.PROCESS_INTERVIEWS).doc(id);
    const specRef = db.collection(COLLECTIONS.SOLUTION_SPECIFICATIONS).doc();
    const now = new Date();

    const spec = await db.runTransaction(async (tx) => {
      const fresh = await tx.get(interviewRef);
      if (!fresh.exists) throw new ApiAuthError(403, "Interview not found");
      const freshData = fresh.data() as ProcessInterviewDoc & {
        latestSpecVersion?: number;
      };
      if (!freshData.readyForSpecification) {
        throw new ApiAuthError(403, "Interview is not ready for specification");
      }
      if (
        freshData.latestSpecVersion !== undefined &&
        freshData.latestSpecVersion !== existingMaxVersion
      ) {
        throw new HttpError(409, "Specification set changed; reload and retry");
      }
      if (previousLatest && previousLatest.status === "approved") {
        throw new HttpError(
          409,
          "Latest specification is approved; create a revision instead",
        );
      }
      const version =
        Math.max(freshData.latestSpecVersion ?? 0, existingMaxVersion) + 1;
      const canonicalHash = computeSpecificationHash({
        interviewId: id,
        departmentId: interview.departmentId,
        version,
        sections: generated.sections,
      });
      const doc: Record<string, unknown> = {
        id: specRef.id,
        interviewId: id,
        departmentId: interview.departmentId,
        title: interview.title,
        version,
        status: "draft",
        canonicalHash,
        sections: generated.sections,
        createdByUid: actor.uid,
        createdByName: actor.email,
        model: generated.model,
        createdAt: now,
        updatedAt: now,
      };
      tx.set(specRef, doc);
      if (
        previousLatest &&
        ["draft", "user_review", "changes_requested"].includes(
          previousLatest.status,
        )
      ) {
        tx.update(
          db
            .collection(COLLECTIONS.SOLUTION_SPECIFICATIONS)
            .doc(previousLatest.id),
          { status: "superseded", updatedAt: now },
        );
      }
      tx.update(interviewRef, {
        status: "ready_for_review",
        latestSpecVersion: version,
        updatedAt: now,
      });
      return doc;
    });

    await writeAuditLog({
      entityType: "specification",
      entityId: specRef.id,
      action: "generate",
      actorUid: actor.uid,
      actorName: actor.email,
      actorRole: actor.role,
      detail: {
        interviewId: id,
        version: spec.version as number,
        canonicalHash: spec.canonicalHash as string,
      },
    });

    return NextResponse.json({ specification: serializeDoc(spec) }, { status: 201 });
  } catch (error) {
    const authError = authErrorResponse(error);
    if (authError) return authError;
    const httpError = httpErrorResponse(error);
    if (httpError) return httpError;
    console.error("Specification POST error:", error);
    return NextResponse.json({ error: "Failed to generate specification" }, { status: 500 });
  }
}
