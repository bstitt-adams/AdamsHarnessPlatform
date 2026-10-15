import { NextRequest } from "next/server";
import { COLLECTIONS } from "@/lib/schema";
import {
  authErrorResponse,
  requireUser,
  ApiAuthError,
} from "@/lib/auth/server-auth";
import {
  getDb,
  HttpError,
  isAdminActor,
  isDepartmentOwner,
  writeAuditLog,
} from "@/lib/adams-harness/server-store";
import {
  DepartmentDoc,
  ModuleBuildDoc,
  ProcessInterviewDoc,
  SolutionSpecificationDoc,
} from "@/lib/adams-harness/types";
import { computeSpecificationHash } from "@/lib/adams-harness/specification";
import {
  buildBranch,
  buildErrorResponse,
  deriveModuleSlug,
  deterministicBuildId,
  serializeModuleBuild,
  startModuleBuildRun,
} from "@/lib/adams-harness/module-builds";
import { getGitHubBaseBranch } from "@/lib/integrations/github";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Ctx) {
  try {
    const actor = await requireUser(request);
    const { id } = await params;
    const db = getDb();

    const specSnap = await db
      .collection(COLLECTIONS.SOLUTION_SPECIFICATIONS)
      .doc(id)
      .get();
    if (!specSnap.exists) throw new HttpError(404, "Specification not found.");
    const spec = {
      id: specSnap.id,
      ...specSnap.data(),
    } as SolutionSpecificationDoc;

    const interviewSnap = await db
      .collection(COLLECTIONS.PROCESS_INTERVIEWS)
      .doc(spec.interviewId)
      .get();
    if (!interviewSnap.exists) throw new HttpError(404, "Interview not found.");
    const interview = interviewSnap.data() as ProcessInterviewDoc;

    const deptSnap = await db
      .collection(COLLECTIONS.DEPARTMENTS)
      .doc(interview.departmentId)
      .get();
    const department = deptSnap.exists
      ? ({ id: deptSnap.id, ...deptSnap.data() } as DepartmentDoc)
      : null;
    const canBuild = department
      ? isDepartmentOwner(actor, department)
      : isAdminActor(actor);
    if (!canBuild) {
      throw new ApiAuthError(403, "Department owner or admin required.");
    }

    if (spec.status !== "approved") {
      throw new HttpError(409, "Only approved specifications can generate modules.");
    }
    if (
      interview.latestSpecVersion !== undefined &&
      interview.latestSpecVersion !== spec.version
    ) {
      throw new HttpError(409, "Only the latest specification version can be built.");
    }
    const recomputedHash = computeSpecificationHash({
      interviewId: spec.interviewId,
      departmentId: spec.departmentId,
      version: spec.version,
      sections: spec.sections,
    });
    if (
      recomputedHash.toLowerCase() !== spec.approval?.canonicalHash?.toLowerCase()
    ) {
      throw new HttpError(409, "Specification content does not match approved hash.");
    }

    const specHash = spec.approval.canonicalHash;
    const buildId = deterministicBuildId(spec.id, specHash);
    const buildRef = db.collection(COLLECTIONS.MODULE_BUILDS).doc(buildId);
    const specRef = db
      .collection(COLLECTIONS.SOLUTION_SPECIFICATIONS)
      .doc(spec.id);
    const interviewRef = db
      .collection(COLLECTIONS.PROCESS_INTERVIEWS)
      .doc(spec.interviewId);
    const slug = deriveModuleSlug(spec.title);
    const baseBranch = getGitHubBaseBranch();

    const created = await db.runTransaction(async (tx) => {
      const existingSnap = await tx.get(buildRef);
      if (existingSnap.exists) {
        return {
          build: existingSnap.data() as ModuleBuildDoc,
          fresh: false as const,
        };
      }
      const freshSpecSnap = await tx.get(specRef);
      if (!freshSpecSnap.exists) {
        throw new HttpError(404, "Specification not found.");
      }
      const freshSpec = {
        id: freshSpecSnap.id,
        ...freshSpecSnap.data(),
      } as SolutionSpecificationDoc;
      const freshInterviewSnap = await tx.get(interviewRef);
      if (!freshInterviewSnap.exists) {
        throw new HttpError(404, "Interview not found.");
      }
      const freshInterview = freshInterviewSnap.data() as ProcessInterviewDoc;

      if (freshSpec.status !== "approved") {
        throw new HttpError(409, "Only approved specifications can generate modules.");
      }
      if (
        freshInterview.latestSpecVersion === undefined ||
        freshSpec.version !== freshInterview.latestSpecVersion
      ) {
        throw new HttpError(409, "Only the latest specification version can be built.");
      }
      const freshHash = computeSpecificationHash({
        interviewId: freshSpec.interviewId,
        departmentId: freshSpec.departmentId,
        version: freshSpec.version,
        sections: freshSpec.sections,
      });
      if (
        freshHash.toLowerCase() !== freshSpec.canonicalHash.toLowerCase() ||
        freshHash.toLowerCase() !==
          freshSpec.approval?.canonicalHash?.toLowerCase() ||
        freshHash.toLowerCase() !== specHash.toLowerCase()
      ) {
        throw new HttpError(409, "Specification content does not match approved hash.");
      }
      const now = new Date() as unknown as ModuleBuildDoc["createdAt"];
      const build: ModuleBuildDoc = {
        id: buildId,
        specificationId: freshSpec.id,
        specificationVersion: freshSpec.version,
        specificationHash: specHash,
        interviewId: freshSpec.interviewId,
        departmentId: freshSpec.departmentId,
        slug,
        branch: buildBranch(buildId, slug),
        baseBranch,
        status: "queued",
        requestedByUid: actor.uid,
        changedFiles: [],
        checks: [],
        createdAt: now,
        updatedAt: now,
      };
      tx.set(buildRef, build);
      tx.update(specRef, { latestBuildId: buildId });
      return { build, spec: freshSpec, fresh: true as const };
    });

    if (created.fresh) {
      await writeAuditLog({
        entityType: "module_build",
        entityId: created.build.id,
        action: "build_created",
        actorUid: actor.uid,
        actorName: actor.email,
        actorRole: actor.role,
        detail: {
          specificationId: created.spec.id,
          version: created.build.specificationVersion,
        },
      });
      const started = await startModuleBuildRun(created.build, created.spec);
      return Response.json({ build: serializeModuleBuild(started) });
    }
    return Response.json({ build: serializeModuleBuild(created.build) });
  } catch (error) {
    if (error instanceof ApiAuthError) return authErrorResponse(error);
    const response = buildErrorResponse(error);
    if (response) return response;
    console.error("Module build error:", error);
    return Response.json({ error: "Module build failed." }, { status: 500 });
  }
}
