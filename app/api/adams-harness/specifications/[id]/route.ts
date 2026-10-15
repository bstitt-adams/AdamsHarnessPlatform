import { NextRequest, NextResponse } from "next/server";
import { requireUser, authErrorResponse, ApiAuthError } from "@/lib/auth/server-auth";
import {
  patchSpecificationSchema,
  type DepartmentDoc,
  type ProcessInterviewDoc,
  type SolutionSpecificationDoc,
  type SpecificationSections,
} from "@/lib/adams-harness/types";
import { computeSpecificationHash } from "@/lib/adams-harness/specification";
import {
  canAccessDepartment,
  getDb,
  httpErrorResponse,
  HttpError,
  interviewCapabilities,
  isDepartmentOwner,
  serializeDoc,
  writeAuditLog,
} from "@/lib/adams-harness/server-store";
import { COLLECTIONS } from "@/lib/schema";

async function loadSpecAndAccess(db: FirebaseFirestore.Firestore, id: string) {
  const snap = await db.collection(COLLECTIONS.SOLUTION_SPECIFICATIONS).doc(id).get();
  if (!snap.exists) return { spec: null, department: null, interview: null };
  const spec = { id: snap.id, ...snap.data() } as SolutionSpecificationDoc;
  const deptSnap = await db
    .collection(COLLECTIONS.DEPARTMENTS)
    .doc(spec.departmentId)
    .get();
  const department = deptSnap.exists
    ? ({ id: deptSnap.id, ...deptSnap.data() } as DepartmentDoc)
    : null;
  const interviewSnap = await db
    .collection(COLLECTIONS.PROCESS_INTERVIEWS)
    .doc(spec.interviewId)
    .get();
  const interview = interviewSnap.exists
    ? ({ id: interviewSnap.id, ...interviewSnap.data() } as ProcessInterviewDoc)
    : null;
  return { spec, department, interview };
}

function specAuthorized(
  actor: { uid: string },
  spec: SolutionSpecificationDoc,
  interview: ProcessInterviewDoc | null,
): boolean {
  if (spec.createdByUid === actor.uid) return true;
  if (interview?.createdByUid === actor.uid) return true;
  return false;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireUser(request);
    const { id } = await params;
    const db = getDb();
    const { spec, department, interview } = await loadSpecAndAccess(db, id);
    if (!spec) {
      return NextResponse.json({ error: "Specification not found" }, { status: 404 });
    }
    if (
      !specAuthorized(actor, spec, interview) &&
      !(department && canAccessDepartment(actor, department))
    ) {
      throw new ApiAuthError(403, "Not authorized for this specification");
    }
    const capabilities = interview
      ? interviewCapabilities(actor, interview, department)
      : {
          isOwner: spec.createdByUid === actor.uid,
          canApprove: false,
          canRevise: false,
        };
    return NextResponse.json({
      specification: serializeDoc(spec),
      capabilities: {
        ...capabilities,
        isOwner: capabilities.isOwner || spec.createdByUid === actor.uid,
      },
    });
  } catch (error) {
    const authError = authErrorResponse(error);
    if (authError) return authError;
    const httpError = httpErrorResponse(error);
    if (httpError) return httpError;
    console.error("Specification GET error:", error);
    return NextResponse.json({ error: "Failed to load specification" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireUser(request);
    const { id } = await params;
    const parsed = patchSpecificationSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid specification update" }, { status: 400 });
    }
    if (!parsed.data.title && !parsed.data.sections) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const db = getDb();
    const { spec, department, interview } = await loadSpecAndAccess(db, id);
    if (!spec) {
      return NextResponse.json({ error: "Specification not found" }, { status: 404 });
    }
    if (!interview) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 });
    }
    if (!interviewCapabilities(actor, interview, department).canRevise) {
      throw new ApiAuthError(403, "Only the interview owner or a department owner can revise");
    }

    const siblingSpecs = await db
      .collection(COLLECTIONS.SOLUTION_SPECIFICATIONS)
      .where("interviewId", "==", spec.interviewId)
      .get();
    const preQueryMax = siblingSpecs.docs.reduce(
      (max, d) =>
        Math.max(max, (d.data() as SolutionSpecificationDoc).version || 0),
      0,
    );

    const specRef = db.collection(COLLECTIONS.SOLUTION_SPECIFICATIONS).doc(id);
    const interviewRef = db
      .collection(COLLECTIONS.PROCESS_INTERVIEWS)
      .doc(spec.interviewId);
    const newRef = db.collection(COLLECTIONS.SOLUTION_SPECIFICATIONS).doc();
    const now = new Date();

    const revised = await db.runTransaction(async (tx) => {
      const freshSnap = await tx.get(specRef);
      if (!freshSnap.exists) throw new HttpError(404, "Specification not found");
      const fresh = freshSnap.data() as SolutionSpecificationDoc;
      if (fresh.status === "approved" || fresh.status === "superseded") {
        throw new HttpError(409, "Source specification is no longer revisable");
      }

      const interviewSnap = await tx.get(interviewRef);
      if (!interviewSnap.exists) throw new HttpError(404, "Interview not found");
      const interviewData = interviewSnap.data() as ProcessInterviewDoc & {
        latestSpecVersion?: number;
      };
      if (
        interviewData.createdByUid !== actor.uid &&
        !(department && isDepartmentOwner(actor, department))
      ) {
        throw new HttpError(403, "Only the interview owner or a department owner can revise");
      }
      const latestVersion = interviewData.latestSpecVersion ?? preQueryMax;
      if (fresh.version !== latestVersion) {
        throw new HttpError(409, "Only the latest specification can be revised");
      }
      const version = latestVersion + 1;

      const newSections: SpecificationSections = {
        ...fresh.sections,
        ...(parsed.data.sections ?? {}),
      };
      const canonicalHash = computeSpecificationHash({
        interviewId: fresh.interviewId,
        departmentId: fresh.departmentId,
        version,
        sections: newSections,
      });

      const doc: Record<string, unknown> = {
        id: newRef.id,
        interviewId: fresh.interviewId,
        departmentId: fresh.departmentId,
        title: parsed.data.title ?? fresh.title,
        version,
        status: "draft",
        canonicalHash,
        sections: newSections,
        changeSummary: parsed.data.changeSummary || "Manual revision",
        createdByUid: actor.uid,
        createdByName: actor.email,
        model: fresh.model,
        createdAt: now,
        updatedAt: now,
      };

      tx.update(specRef, { status: "superseded", updatedAt: now });
      tx.set(newRef, doc);
      tx.set(interviewRef, { latestSpecVersion: version }, { merge: true });
      return doc;
    });

    await writeAuditLog({
      entityType: "specification",
      entityId: newRef.id,
      action: "revise",
      actorUid: actor.uid,
      actorName: actor.email,
      actorRole: actor.role,
      detail: {
        supersedes: spec.id,
        version: revised.version as number,
        canonicalHash: revised.canonicalHash as string,
      },
    });

    return NextResponse.json({ specification: serializeDoc(revised) }, { status: 201 });
  } catch (error) {
    const authError = authErrorResponse(error);
    if (authError) return authError;
    const httpError = httpErrorResponse(error);
    if (httpError) return httpError;
    console.error("Specification PATCH error:", error);
    return NextResponse.json({ error: "Failed to revise specification" }, { status: 500 });
  }
}
