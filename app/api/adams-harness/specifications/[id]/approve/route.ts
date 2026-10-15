import { NextRequest, NextResponse } from "next/server";
import { requireUser, authErrorResponse, ApiAuthError } from "@/lib/auth/server-auth";
import {
  approveSpecificationSchema,
  type DepartmentDoc,
  type ProcessInterviewDoc,
  type SolutionSpecificationDoc,
} from "@/lib/adams-harness/types";
import {
  getDb,
  httpErrorResponse,
  HttpError,
  isAdminActor,
  isDepartmentOwner,
  serializeDoc,
  writeAuditLog,
} from "@/lib/adams-harness/server-store";
import { COLLECTIONS } from "@/lib/schema";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireUser(request);
    const { id } = await params;
    const parsed = approveSpecificationSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid approval action" }, { status: 400 });
    }
    const { action, note, canonicalHash } = parsed.data;

    const db = getDb();
    const ref = db.collection(COLLECTIONS.SOLUTION_SPECIFICATIONS).doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Specification not found" }, { status: 404 });
    }
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
    const isOwner =
      spec.createdByUid === actor.uid ||
      (interviewSnap.exists && interviewSnap.data()?.createdByUid === actor.uid);

    const canApprove =
      isAdminActor(actor) || (department ? isDepartmentOwner(actor, department) : false);

    if (action === "approve") {
      if (!canApprove) {
        throw new ApiAuthError(403, "Only a department owner or admin can approve");
      }
    } else if (!isOwner && !canApprove) {
      throw new ApiAuthError(403, "Not authorized for this specification");
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

    const interviewRef = db
      .collection(COLLECTIONS.PROCESS_INTERVIEWS)
      .doc(spec.interviewId);
    const now = new Date();
    await db.runTransaction(async (tx) => {
      const freshSnap = await tx.get(ref);
      if (!freshSnap.exists) throw new HttpError(404, "Specification not found");
      const fresh = freshSnap.data() as SolutionSpecificationDoc;

      const interviewTxSnap = await tx.get(interviewRef);
      if (!interviewTxSnap.exists) throw new HttpError(404, "Interview not found");
      const interviewData = interviewTxSnap.data() as ProcessInterviewDoc & {
        latestSpecVersion?: number;
      };
      const latestVersion = interviewData.latestSpecVersion ?? preQueryMax;
      if (fresh.version !== latestVersion) {
        throw new HttpError(409, "Only the latest specification can be actioned");
      }

      if (canonicalHash.toLowerCase() !== fresh.canonicalHash.toLowerCase()) {
        throw new HttpError(409, "Specification content has changed; reload and retry");
      }

      const update: Record<string, unknown> = { updatedAt: now };
      if (action === "submit_review") {
        if (fresh.status !== "draft" && fresh.status !== "changes_requested") {
          throw new HttpError(409, `Cannot submit from status ${fresh.status}`);
        }
        update.status = "user_review";
      } else if (action === "request_changes") {
        if (fresh.status !== "user_review") {
          throw new HttpError(409, `Cannot request changes from status ${fresh.status}`);
        }
        update.status = "changes_requested";
      } else {
        if (fresh.status !== "user_review") {
          throw new HttpError(409, `Cannot approve from status ${fresh.status}`);
        }
        update.status = "approved";
        update.approval = {
          approvedByUid: actor.uid,
          approvedByName: actor.email,
          approvedByRole: actor.role,
          approvedAt: now,
          canonicalHash: fresh.canonicalHash,
        };
      }
      tx.update(ref, update);
    });

    await writeAuditLog({
      entityType: "specification",
      entityId: id,
      action:
        action === "submit_review"
          ? "submit_review"
          : action === "request_changes"
            ? "request_changes"
            : "approve",
      actorUid: actor.uid,
      actorName: actor.email,
      actorRole: actor.role,
      detail: {
        canonicalHash,
        version: spec.version,
        ...(note ? { note } : {}),
      },
    });

    const updated = (await ref.get()).data() as SolutionSpecificationDoc;
    return NextResponse.json({ specification: serializeDoc({ ...updated, id: ref.id }) });
  } catch (error) {
    const authError = authErrorResponse(error);
    if (authError) return authError;
    const httpError = httpErrorResponse(error);
    if (httpError) return httpError;
    console.error("Specification approve error:", error);
    return NextResponse.json({ error: "Failed to update specification" }, { status: 500 });
  }
}
