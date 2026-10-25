import { createHash } from "node:crypto";
import { COLLECTIONS } from "@/lib/schema";
import type { AuthenticatedActor } from "@/lib/auth/server-auth";
import {
  type DepartmentDoc,
  type InterviewPrdDoc,
  type ModuleBuildDoc,
  type ProcessInterviewDoc,
  type SolutionSpecificationDoc,
} from "./types";
import {
  getDb,
  HttpError,
  serializeDoc,
  writeAuditLog,
} from "./server-store";
import { computeSpecificationHash } from "./specification";
import { generateInterviewPrdAnalysis } from "./prd-generator";
import {
  listAllAvailableModules,
  slugifySolutionTitle,
} from "@/lib/modules/dynamic-catalog";
import {
  deterministicBuildId,
  buildBranch,
  startModuleBuildRun,
} from "./module-builds";
import { getGitHubBaseBranch } from "@/lib/integrations/github";

export function prdHash(input: {
  interviewId: string;
  version: number;
  content: string;
  sections: unknown;
}): string {
  return createHash("sha256")
    .update(JSON.stringify(input), "utf8")
    .digest("hex");
}

export async function loadInterviewForPrd(interviewId: string) {
  const db = getDb();
  const snap = await db.collection(COLLECTIONS.PROCESS_INTERVIEWS).doc(interviewId).get();
  if (!snap.exists) throw new HttpError(404, "Interview not found.");
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

export async function listInterviewPrds(interviewId?: string): Promise<InterviewPrdDoc[]> {
  const db = getDb();
  const base = db.collection(COLLECTIONS.INTERVIEW_PRDS);
  const snapshot = interviewId
    ? await base.where("interviewId", "==", interviewId).get()
    : await base.get();
  return snapshot.docs
    .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }) as InterviewPrdDoc)
    .sort((a, b) => {
      const interviewCompare = a.interviewId.localeCompare(b.interviewId);
      if (interviewCompare !== 0) return interviewCompare;
      return b.version - a.version;
    });
}

export async function getLatestInterviewPrd(interviewId: string) {
  const prds = await listInterviewPrds(interviewId);
  return prds[0] ?? null;
}

export async function createInterviewPrd(input: {
  interviewId: string;
  actor: AuthenticatedActor;
  adminContext?: string;
  previousPrd?: InterviewPrdDoc | null;
}): Promise<InterviewPrdDoc> {
  const { interview } = await loadInterviewForPrd(input.interviewId);
  const latest = input.previousPrd ?? (await getLatestInterviewPrd(input.interviewId));
  const modules = await listAllAvailableModules();
  const generated = await generateInterviewPrdAnalysis({
    interview,
    modules,
    previousPrd: latest,
    adminContext: input.adminContext,
  });

  const db = getDb();
  const ref = db.collection(COLLECTIONS.INTERVIEW_PRDS).doc();
  const now = new Date() as unknown as InterviewPrdDoc["createdAt"];
  const version = (latest?.version ?? 0) + 1;
  const doc: InterviewPrdDoc = {
    id: ref.id,
    interviewId: interview.id,
    departmentId: interview.departmentId,
    title: generated.analysis.title,
    version,
    status: "draft",
    requestKind: generated.analysis.requestKind,
    targetApp: generated.analysis.targetApp,
    classificationReason: generated.analysis.classificationReason,
    executiveSummary: generated.analysis.executiveSummary,
    content: generated.analysis.prdMarkdown,
    sections: generated.analysis.sections,
    specificationSections: generated.analysis.specificationSections,
    dataSharingOpportunities: generated.analysis.dataSharingOpportunities,
    integrationRecommendations: generated.analysis.integrationRecommendations,
    adminNotes: input.adminContext || latest?.adminNotes || "",
    requiresRegeneration: false,
    canonicalHash: prdHash({
      interviewId: interview.id,
      version,
      content: generated.analysis.prdMarkdown,
      sections: generated.analysis.sections,
    }),
    createdByUid: input.actor.uid,
    createdByName: input.actor.email,
    model: generated.model,
    createdAt: now,
    updatedAt: now,
  };

  const batch = db.batch();
  batch.set(ref, doc);
  if (latest && latest.status !== "superseded" && latest.status !== "deployed") {
    batch.update(db.collection(COLLECTIONS.INTERVIEW_PRDS).doc(latest.id), {
      status: "superseded",
      updatedAt: new Date(),
    });
  }
  await batch.commit();

  await writeAuditLog({
    entityType: "interview_prd",
    entityId: ref.id,
    action: latest ? "regenerate" : "generate",
    actorUid: input.actor.uid,
    actorName: input.actor.email,
    actorRole: input.actor.role,
    detail: {
      interviewId: interview.id,
      version,
      requestKind: doc.requestKind,
      targetAppSlug: doc.targetApp?.slug || null,
      model: doc.model || null,
    },
  });

  return doc;
}

function prdSpecificationTitle(prd: InterviewPrdDoc, interview: ProcessInterviewDoc) {
  return prd.title.replace(/\s+product requirements$/i, "").trim() || interview.title;
}

async function createApprovedSpecificationForPrd(input: {
  prd: InterviewPrdDoc;
  interview: ProcessInterviewDoc;
  actor: AuthenticatedActor;
}): Promise<SolutionSpecificationDoc> {
  const { prd, interview, actor } = input;
  const db = getDb();
  const specsSnapshot = await db
    .collection(COLLECTIONS.SOLUTION_SPECIFICATIONS)
    .where("interviewId", "==", interview.id)
    .get();
  const latestSpec = specsSnapshot.docs
    .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }) as SolutionSpecificationDoc)
    .sort((a, b) => b.version - a.version)[0];
  const version = (latestSpec?.version ?? 0) + 1;
  const canonicalHash = computeSpecificationHash({
    interviewId: interview.id,
    departmentId: interview.departmentId,
    version,
    sections: prd.specificationSections,
  });
  const ref = db
    .collection(COLLECTIONS.SOLUTION_SPECIFICATIONS)
    .doc(`prd_${prd.id.replace(/[^A-Za-z0-9_-]/g, "_")}`);
  const now = new Date() as unknown as SolutionSpecificationDoc["createdAt"];
  const spec: SolutionSpecificationDoc = {
    id: ref.id,
    interviewId: interview.id,
    departmentId: interview.departmentId,
    title: prdSpecificationTitle(prd, interview),
    version,
    status: "approved",
    canonicalHash,
    sections: prd.specificationSections,
    changeSummary: `Deployed from admin PRD v${prd.version}.`,
    approval: {
      approvedByUid: actor.uid,
      approvedByName: actor.email,
      approvedByRole: actor.role,
      approvedAt: now,
      canonicalHash,
    },
    createdByUid: actor.uid,
    createdByName: actor.email,
    model: prd.model || "admin-prd-workflow",
    createdAt: now,
    updatedAt: now,
  };

  const batch = db.batch();
  batch.set(ref, spec);
  if (latestSpec && latestSpec.status !== "approved") {
    batch.update(
      db.collection(COLLECTIONS.SOLUTION_SPECIFICATIONS).doc(latestSpec.id),
      { status: "superseded", updatedAt: new Date() },
    );
  }
  batch.update(db.collection(COLLECTIONS.PROCESS_INTERVIEWS).doc(interview.id), {
    latestSpecVersion: version,
    readyForSpecification: true,
    status: "ready_for_review",
    updatedAt: new Date(),
  });
  batch.update(db.collection(COLLECTIONS.INTERVIEW_PRDS).doc(prd.id), {
    specificationId: ref.id,
    updatedAt: new Date(),
  });
  await batch.commit();
  return spec;
}

export async function deployInterviewPrd(input: {
  prdId: string;
  actor: AuthenticatedActor;
}): Promise<{ prd: InterviewPrdDoc; specification: SolutionSpecificationDoc; build: ModuleBuildDoc }> {
  const db = getDb();
  const prdSnap = await db.collection(COLLECTIONS.INTERVIEW_PRDS).doc(input.prdId).get();
  if (!prdSnap.exists) throw new HttpError(404, "PRD not found.");
  const prd = { id: prdSnap.id, ...prdSnap.data() } as InterviewPrdDoc;
  if (prd.status !== "staged" && prd.status !== "deployed") {
    throw new HttpError(409, "Only staged PRDs can be deployed.");
  }
  if (prd.requiresRegeneration) {
    throw new HttpError(409, "Regenerate the PRD before staging or deployment so manual edits are incorporated into the specification.");
  }
  const latest = await getLatestInterviewPrd(prd.interviewId);
  if (latest?.id !== prd.id) {
    throw new HttpError(409, "Only the latest PRD version can be deployed.");
  }

  if (prd.status === "deployed" && prd.latestBuildId) {
    const buildSnap = await db
      .collection(COLLECTIONS.MODULE_BUILDS)
      .doc(prd.latestBuildId)
      .get();
    const specSnap = prd.specificationId
      ? await db.collection(COLLECTIONS.SOLUTION_SPECIFICATIONS).doc(prd.specificationId).get()
      : null;
    if (buildSnap.exists && specSnap?.exists) {
      return {
        prd,
        specification: { id: specSnap.id, ...specSnap.data() } as SolutionSpecificationDoc,
        build: buildSnap.data() as ModuleBuildDoc,
      };
    }
  }

  const { interview } = await loadInterviewForPrd(prd.interviewId);
  const spec = await createApprovedSpecificationForPrd({ prd, interview, actor: input.actor });
  const slug = slugifySolutionTitle(spec.title, interview.id);
  const buildId = deterministicBuildId(spec.id, spec.canonicalHash);
  const buildRef = db.collection(COLLECTIONS.MODULE_BUILDS).doc(buildId);
  const buildSnap = await buildRef.get();
  const now = new Date() as unknown as ModuleBuildDoc["createdAt"];
  const build: ModuleBuildDoc = buildSnap.exists
    ? (buildSnap.data() as ModuleBuildDoc)
    : {
        id: buildId,
        specificationId: spec.id,
        specificationVersion: spec.version,
        specificationHash: spec.canonicalHash,
        interviewId: interview.id,
        departmentId: interview.departmentId,
        slug,
        branch: buildBranch(buildId, slug),
        baseBranch: getGitHubBaseBranch(),
        status: "queued",
        requestedByUid: input.actor.uid,
        changedFiles: [],
        checks: [],
        createdAt: now,
        updatedAt: now,
      };

  if (!buildSnap.exists) {
    const batch = db.batch();
    batch.set(buildRef, build);
    batch.update(db.collection(COLLECTIONS.SOLUTION_SPECIFICATIONS).doc(spec.id), {
      latestBuildId: buildId,
      updatedAt: new Date(),
    });
    batch.update(db.collection(COLLECTIONS.INTERVIEW_PRDS).doc(prd.id), {
      status: "deploying",
      latestBuildId: buildId,
      moduleSlug: slug,
      updatedAt: new Date(),
    });
    await batch.commit();
  }

  const started = build.status === "queued" ? await startModuleBuildRun(build, spec) : build;
  const finalStatus = started.status === "deployed" ? "deployed" : "deploying";
  const prdUpdates: Partial<InterviewPrdDoc> = {
    status: finalStatus,
    latestBuildId: buildId,
    moduleSlug: slug,
    updatedAt: new Date() as unknown as InterviewPrdDoc["updatedAt"],
  };
  if (started.productionUrl) prdUpdates.productionUrl = started.productionUrl;
  if (started.status === "deployed") {
    prdUpdates.deployedAt = new Date() as unknown as InterviewPrdDoc["deployedAt"];
  }
  await db.collection(COLLECTIONS.INTERVIEW_PRDS).doc(prd.id).update(prdUpdates);

  await writeAuditLog({
    entityType: "interview_prd",
    entityId: prd.id,
    action: "deploy",
    actorUid: input.actor.uid,
    actorName: input.actor.email,
    actorRole: input.actor.role,
    detail: {
      interviewId: prd.interviewId,
      specificationId: spec.id,
      buildId,
      moduleSlug: slug,
      buildStatus: started.status,
    },
  });

  const updatedPrd = {
    ...prd,
    ...prdUpdates,
  } as InterviewPrdDoc;
  return { prd: updatedPrd, specification: spec, build: started };
}

export function serializeInterviewPrd(prd: InterviewPrdDoc) {
  return serializeDoc(prd);
}
