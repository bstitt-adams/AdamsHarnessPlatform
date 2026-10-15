import { FieldValue } from "firebase-admin/firestore";
import { COLLECTIONS } from "@/lib/schema";
import {
  ModuleBuildDoc,
  ModuleBuildStatus,
  SolutionSpecificationDoc,
} from "@/lib/adams-harness/types";
import {
  getDb,
  HttpError,
  serializeDoc,
  writeAuditLog,
} from "@/lib/adams-harness/server-store";
import { getHermesRun, startHermesRun } from "@/lib/hermes/client";
import {
  compareCommits,
  ensurePullRequest,
  getBranchHead,
  getProductionDeployUrl,
  getPullRequest,
  listCommitChecks,
  mergePullRequest,
  NormalizedCheck,
} from "@/lib/integrations/github";
import { validateGeneratedFiles } from "@/lib/modules/generation-policy";
import { validateGeneratedSources } from "@/lib/modules/source-policy";

const TERMINAL_STATUSES: ModuleBuildStatus[] = ["deployed", "failed"];
const PASSING_CONCLUSIONS = new Set(["success", "neutral", "skipped"]);

export class BuildError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "BuildError";
  }
}

export function buildErrorResponse(error: unknown): Response | null {
  if (error instanceof BuildError || error instanceof HttpError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  return null;
}

export function buildBranch(buildId: string, slug: string): string {
  const safeSlug = slug
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 40);
  const shortId = buildId
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 10)
    .toLowerCase();
  return `adams-module/${safeSlug}-${shortId}`;
}

export function deriveModuleSlug(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-")
    .slice(0, 48)
    .replace(/^-+|-+$/g, "");
  return slug.length > 0 ? slug : `module-${Date.now().toString(36)}`;
}

export function deterministicBuildId(specId: string, specHash: string): string {
  const safeSpec = specId.replace(/[^A-Za-z0-9_-]/g, "_");
  return `build_${safeSpec}_${specHash.slice(0, 16)}`;
}

export async function loadModuleBuild(
  buildId: string,
): Promise<ModuleBuildDoc | null> {
  const snap = await getDb()
    .collection(COLLECTIONS.MODULE_BUILDS)
    .doc(buildId)
    .get();
  return snap.exists ? (snap.data() as ModuleBuildDoc) : null;
}

export async function saveModuleBuild(
  buildId: string,
  updates: Partial<ModuleBuildDoc>,
): Promise<void> {
  const data: Record<string, unknown> = {
    updatedAt: new Date() as unknown as ModuleBuildDoc["updatedAt"],
  };
  for (const [key, value] of Object.entries(updates)) {
    data[key] = value === undefined ? FieldValue.delete() : value;
  }
  await getDb().collection(COLLECTIONS.MODULE_BUILDS).doc(buildId).update(data);
}

function buildHermesInstructions(workspace: string): string {
  return [
    "You are generating code inside a preconfigured Next.js + TypeScript workspace.",
    `First, cd into the workspace at ${workspace} and stay inside it for all operations.`,
    "You MUST operate unattended: never request human approval, never run destructive or network-mutating commands beyond the explicit instructions.",
    "You may ONLY create or update these files, replacing <slug> with the exact module slug given in the input:",
    "- modules/generated/<slug>/definition.ts",
    "- modules/generated/<slug>/index.ts",
    "- modules/generated/registry.ts",
    "Do NOT create a definition.test.ts or any other file.",
    "definition.ts MUST contain exactly one import and one export:",
    "  import { validateModuleDefinition } from \"@/lib/modules/contract\";",
    "  export const definition = validateModuleDefinition({ ...literal object... });",
    "index.ts MUST be exactly:",
    "  export { definition } from \"./definition\";",
    "registry.ts MUST keep its existing shape: the ModuleDefinition type import, one `import { definition as <alias> } from \"./<slug>\";` per module, `export const GENERATED_MODULES: ModuleDefinition[] = [...];` containing every alias, and `export function getGeneratedModule(slug: string)` returning `GENERATED_MODULES.find((m) => m.slug === slug)`. Preserve every existing import and array entry; add the new one.",
    "Only literals (strings, numbers, booleans, null, arrays, plain objects) may appear inside validateModuleDefinition(...). No variables, calls, spreads, template literals, or computed keys.",
    "Do NOT add dependencies, config files, environment variables, shared code, or files outside the allowlist. Do NOT install packages. Do NOT modify any other path.",
    "Do NOT call external APIs, deploy, merge PRs, or touch databases.",
    "Workflow: checkout the given base branch, create the exact given branch, generate the files, run 'npx tsc --noEmit' and 'npx eslint' on the generated files, fix errors, commit and push the branch. Reply with only a short summary.",
  ].join("\n");
}

function buildHermesPrompt(
  spec: SolutionSpecificationDoc,
  build: ModuleBuildDoc,
): string {
  const sectionsJson = JSON.stringify(spec.sections);
  const isVehicle = /vehicle|inspection|truck|fleet/i.test(
    `${spec.title} ${sectionsJson}`,
  );
  return [
    `Generate a constrained generated module for the Adams Harness platform.`,
    `Module slug: ${build.slug}`,
    `Department id: ${build.departmentId}`,
    `Git branch to create from ${build.baseBranch}: ${build.branch}`,
    `Specification title: ${spec.title}`,
    `Specification (immutable JSON, hash ${spec.canonicalHash}, version ${spec.version}):`,
    sectionsJson,
    isVehicle
      ? "The specification describes vehicle/equipment inspection. Include inspection record types with check items, defects, pass/fail status, photos, signatures, an overdue-inspection workflow, and dashboards for open defects and upcoming inspections."
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

async function markFailed(
  build: ModuleBuildDoc,
  reason: string,
): Promise<ModuleBuildDoc> {
  const safe = reason.slice(0, 1900);
  await saveModuleBuild(build.id, { status: "failed", failureReason: safe });
  await writeAuditLog({
    entityType: "module_build",
    entityId: build.id,
    action: "build_failed",
    actorUid: build.requestedByUid,
    actorName: "system",
    actorRole: "system",
    detail: { message: safe },
  });
  return { ...build, status: "failed", failureReason: safe };
}

export async function startModuleBuildRun(
  build: ModuleBuildDoc,
  spec: SolutionSpecificationDoc,
): Promise<ModuleBuildDoc> {
  const workspace = process.env.HERMES_BUILD_WORKSPACE?.trim();
  if (!workspace) {
    return markFailed(
      build,
      "HERMES_BUILD_WORKSPACE is not configured; generation cannot start.",
    );
  }
  try {
    const { runId } = await startHermesRun({
      prompt: buildHermesPrompt(spec, build),
      instructions: buildHermesInstructions(workspace),
      idempotencyKey: `module-build-${build.id}`,
    });
    await saveModuleBuild(build.id, { status: "generating", hermesRunId: runId });
    await writeAuditLog({
      entityType: "module_build",
      entityId: build.id,
      action: "hermes_run_started",
      actorUid: build.requestedByUid,
      actorName: "system",
      actorRole: "system",
      detail: { runId },
    });
    return { ...build, status: "generating", hermesRunId: runId };
  } catch (error) {
    const reason =
      error instanceof Error ? error.message : "Failed to start generation run.";
    return markFailed(build, `Hermes run start failed: ${reason}`);
  }
}

function validateDiff(
  files: { filename: string; status: string }[],
  slug: string,
): string | null {
  if (files.length === 0) return "Empty diff: generated branch contains no changes.";
  const required = new Set([
    `modules/generated/${slug}/definition.ts`,
    `modules/generated/${slug}/index.ts`,
    "modules/generated/registry.ts",
  ]);
  for (const file of files) {
    if (file.status === "removed" || file.status === "renamed") {
      return `Generated change may not ${file.status === "removed" ? "delete" : "rename"} files (${file.filename}).`;
    }
    required.delete(file.filename);
  }
  if (required.size > 0) {
    return `Generated change missing required files: ${[...required].join(", ")}.`;
  }
  return null;
}

type Readiness =
  | { state: "ready"; previewUrl: string }
  | { state: "pending"; reason?: string }
  | { state: "checks_failed"; reason: string };

function evaluateReadiness(
  checks: NormalizedCheck[],
  previewUrl: string | undefined,
): Readiness {
  const completed = checks.filter((c) => c.status === "completed");
  const pending = checks.filter((c) => c.status !== "completed");
  const failed = completed.filter(
    (c) => c.conclusion !== null && !PASSING_CONCLUSIONS.has(c.conclusion),
  );
  if (failed.length > 0) {
    return {
      state: "checks_failed",
      reason: `Checks failed: ${failed
        .map((c) => c.name)
        .join(", ")
        .slice(0, 500)}`,
    };
  }
  if (pending.length > 0 || checks.length === 0) {
    return { state: "pending" };
  }
  if (!previewUrl) {
    return { state: "pending", reason: "Waiting for Vercel preview." };
  }
  return { state: "ready", previewUrl };
}

interface ValidationOutcome {
  files: { filename: string; status: string }[];
  headSha: string;
  checks: NormalizedCheck[];
  previewUrl?: string;
  pullRequestNumber?: number;
  pullRequestUrl?: string;
  prError?: string;
}

async function validateBranch(
  build: ModuleBuildDoc,
): Promise<ValidationOutcome | ModuleBuildDoc> {
  const head = await getBranchHead(build.branch);
  if (!head) return build;

  const compare = await compareCommits(build.baseBranch, head.sha);
  const diffError = validateDiff(compare.files, build.slug);
  if (diffError) {
    return markFailed(build, diffError);
  }

  const pathPolicy = validateGeneratedFiles(
    compare.files.map((f) => f.filename),
    build.slug,
  );
  if (!pathPolicy.valid) {
    return markFailed(
      build,
      `Generated change touched forbidden paths: ${pathPolicy.forbidden
        .join(", ")
        .slice(0, 500)}`,
    );
  }

  const sourcePolicy = await validateGeneratedSources({
    slug: build.slug,
    sha: head.sha,
    baseRef: build.baseBranch,
    files: compare.files,
  });
  if (!sourcePolicy.valid) {
    return markFailed(
      build,
      `Generated source failed content policy: ${sourcePolicy.reason}`,
    );
  }

  let pr;
  try {
    pr = await ensurePullRequest({
      head: build.branch,
      base: build.baseBranch,
      title: `Generate module: ${build.slug}`,
      body: `Automated constrained module generation for specification ${build.specificationId} v${build.specificationVersion} (hash ${build.specificationHash}).`,
    });
  } catch {
    return {
      files: compare.files,
      headSha: head.sha,
      checks: [],
      prError: "Pull request could not be created yet.",
    };
  }

  if (pr.headSha.toLowerCase() !== head.sha.toLowerCase()) {
    return {
      files: compare.files,
      headSha: head.sha,
      checks: [],
      pullRequestNumber: pr.number,
      pullRequestUrl: pr.htmlUrl,
    };
  }

  const { checks, previewUrl } = await listCommitChecks(head.sha);
  return {
    files: compare.files,
    headSha: head.sha,
    checks,
    previewUrl,
    pullRequestNumber: pr.number,
    pullRequestUrl: pr.htmlUrl,
  };
}

async function reconcileDeploying(
  build: ModuleBuildDoc,
): Promise<ModuleBuildDoc> {
  if (!build.pullRequestNumber) {
    return markFailed(build, "Deploying build is missing pull request.");
  }
  const pr = await getPullRequest(build.pullRequestNumber);
  if (pr.merged) {
    const mergeSha = pr.mergeCommitSha ?? build.mergeCommitSha ?? build.headSha;
    if (!mergeSha) {
      return build;
    }
    const productionUrl = await getProductionDeployUrl(mergeSha);
    if (productionUrl) {
      await saveModuleBuild(build.id, {
        status: "deployed",
        deployedSha: mergeSha,
        mergeCommitSha: mergeSha,
        productionUrl,
        deployedAt: new Date() as unknown as ModuleBuildDoc["deployedAt"],
      });
      await writeAuditLog({
        entityType: "module_build",
        entityId: build.id,
        action: "deployed",
        actorUid: build.requestedByUid,
        actorName: "system",
        actorRole: "system",
        detail: { sha: mergeSha },
      });
      return (await loadModuleBuild(build.id))!;
    }
    if (mergeSha !== build.mergeCommitSha) {
      await saveModuleBuild(build.id, { mergeCommitSha: mergeSha });
      build.mergeCommitSha = mergeSha;
    }
    return build;
  }
  if (pr.state === "closed") {
    return markFailed(build, "Pull request was closed without merging.");
  }
  return build;
}

export async function reconcileModuleBuild(
  buildId: string,
): Promise<ModuleBuildDoc> {
  let build = await loadModuleBuild(buildId);
  if (!build) throw new BuildError(404, "Module build not found.");
  if (TERMINAL_STATUSES.includes(build.status)) return build;

  if (build.status === "deploying") {
    return reconcileDeploying(build);
  }

  if (build.status === "queued" && build.hermesRunId) {
    await saveModuleBuild(build.id, { status: "generating" });
    build = { ...build, status: "generating" };
  }

  if (build.status === "generating") {
    if (!build.hermesRunId) {
      return markFailed(build, "Missing Hermes run id.");
    }
    let run;
    try {
      run = await getHermesRun(build.hermesRunId);
    } catch (error) {
      const reason = error instanceof Error ? error.message : "run status failed";
      if (/not_configured/i.test(reason)) {
        return markFailed(build, `Hermes unavailable: ${reason}`);
      }
      return build;
    }
    if (run.status === "failed" || run.status === "cancelled") {
      return markFailed(build, `Hermes run ${run.status}.`);
    }
    if (run.status === "awaiting_approval") {
      return markFailed(
        build,
        "Hermes run requested approval; unattended generation cannot proceed.",
      );
    }
    if (run.status !== "completed") {
      return build;
    }
    await saveModuleBuild(build.id, { status: "validating" });
    await writeAuditLog({
      entityType: "module_build",
      entityId: build.id,
      action: "hermes_run_completed",
      actorUid: build.requestedByUid,
      actorName: "system",
      actorRole: "system",
    });
    build = { ...build, status: "validating" };
  }

  if (build.status === "validating" || build.status === "preview_ready") {
    const previousStatus = build.status;
    const previousSha = build.headSha;

    let outcome: ValidationOutcome | ModuleBuildDoc;
    try {
      outcome = await validateBranch(build);
    } catch (error) {
      console.error("Build validation error:", error);
      return build;
    }
    if ("status" in outcome && TERMINAL_STATUSES.includes(outcome.status)) {
      return outcome;
    }
    if (!("files" in outcome)) {
      return outcome as ModuleBuildDoc;
    }

    const validation = outcome;
    const shaChanged = previousSha !== undefined && previousSha !== validation.headSha;
    const readiness: Readiness = validation.prError
      ? { state: "pending", reason: validation.prError }
      : !validation.pullRequestNumber
        ? { state: "pending", reason: "Pull request head does not match branch." }
        : evaluateReadiness(validation.checks, validation.previewUrl);

    const nextStatus: ModuleBuildStatus =
      readiness.state === "ready" ? "preview_ready" : "validating";
    const updates: Partial<ModuleBuildDoc> = {
      headSha: validation.headSha,
      changedFiles: validation.files.map((f) => f.filename),
      checks: validation.checks,
      pullRequestNumber: validation.pullRequestNumber ?? build.pullRequestNumber,
      pullRequestUrl: validation.pullRequestUrl ?? build.pullRequestUrl,
      previewUrl: readiness.state === "ready" ? readiness.previewUrl : undefined,
      status: nextStatus,
      failureReason:
        readiness.state !== "ready" && "reason" in readiness && readiness.reason
          ? readiness.reason.slice(0, 1900)
          : undefined,
    };
    await saveModuleBuild(build.id, updates);
    Object.assign(build, updates);

    if (previousStatus !== nextStatus || shaChanged) {
      await writeAuditLog({
        entityType: "module_build",
        entityId: build.id,
        action:
          nextStatus === "preview_ready"
            ? "preview_ready"
            : shaChanged
              ? "branch_updated_revalidating"
              : "build_validating",
        actorUid: build.requestedByUid,
        actorName: "system",
        actorRole: "system",
        detail: { sha: validation.headSha },
      });
    }
  }
  return build;
}

export async function deployModuleBuild(
  buildId: string,
  actor: { uid: string; name: string; role: string },
): Promise<ModuleBuildDoc> {
  const db = getDb();
  let build = await loadModuleBuild(buildId);
  if (!build) throw new BuildError(404, "Module build not found.");

  if (build.status === "deployed") return build;
  if (build.status === "deploying") {
    build = await reconcileDeploying(build);
    if (build.status === "deployed") return build;
    if (build.status === "deploying") {
      const pr = build.pullRequestNumber
        ? await getPullRequest(build.pullRequestNumber)
        : null;
      if (!pr || pr.state !== "open") {
        throw new BuildError(409, "Build is mid-deployment; retry after reconcile.");
      }
    } else {
      throw new BuildError(409, `Build is ${build.status}; cannot deploy.`);
    }
  }

  if (build.status !== "preview_ready" && build.status !== "deploying") {
    throw new BuildError(409, "Build is not ready for deployment.");
  }
  if (!build.headSha || !build.pullRequestNumber) {
    throw new BuildError(409, "Build is missing branch SHA or pull request.");
  }

  const specSnap = await db
    .collection(COLLECTIONS.SOLUTION_SPECIFICATIONS)
    .doc(build.specificationId)
    .get();
  const spec = specSnap.data() as SolutionSpecificationDoc | undefined;
  if (
    !spec ||
    spec.status !== "approved" ||
    spec.approval?.canonicalHash !== build.specificationHash
  ) {
    return markFailed(
      build,
      "Approved specification no longer matches build hash.",
    );
  }
  const interviewSnap = await db
    .collection(COLLECTIONS.PROCESS_INTERVIEWS)
    .doc(build.interviewId)
    .get();
  const interview = interviewSnap.data() as
    | { latestSpecVersion?: number }
    | undefined;
  if (
    interview &&
    interview.latestSpecVersion !== undefined &&
    interview.latestSpecVersion !== build.specificationVersion
  ) {
    throw new BuildError(409, "Specification is no longer the latest version.");
  }

  const head = await getBranchHead(build.branch);
  if (!head || head.sha !== build.headSha) {
    await saveModuleBuild(build.id, {
      status: "validating",
      previewUrl: undefined,
    });
    throw new BuildError(
      409,
      "Branch SHA changed; build returned to validating.",
    );
  }
  const compare = await compareCommits(build.baseBranch, head.sha);
  const diffError = validateDiff(compare.files, build.slug);
  if (diffError) {
    return markFailed(build, diffError);
  }
  const pathPolicy = validateGeneratedFiles(
    compare.files.map((f) => f.filename),
    build.slug,
  );
  if (!pathPolicy.valid) {
    return markFailed(build, "Generated files violate allowlist at deploy time.");
  }
  const sourcePolicy = await validateGeneratedSources({
    slug: build.slug,
    sha: head.sha,
    baseRef: build.baseBranch,
    files: compare.files,
  });
  if (!sourcePolicy.valid) {
    return markFailed(
      build,
      `Generated source failed content policy: ${sourcePolicy.reason}`,
    );
  }
  const { checks, previewUrl } = await listCommitChecks(head.sha);
  if (evaluateReadiness(checks, previewUrl).state !== "ready") {
    await saveModuleBuild(build.id, {
      status: "validating",
      checks,
      previewUrl: undefined,
    });
    throw new BuildError(
      409,
      "Checks or preview no longer passing; returned to validating.",
    );
  }
  const pr = await getPullRequest(build.pullRequestNumber);
  if (pr.state !== "open" || pr.headSha.toLowerCase() !== head.sha.toLowerCase()) {
    throw new BuildError(409, "Pull request no longer matches branch head.");
  }

  const ref = db.collection(COLLECTIONS.MODULE_BUILDS).doc(build.id);
  const claimed = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const fresh = snap.data() as ModuleBuildDoc | undefined;
    if (!fresh) throw new BuildError(404, "Module build not found.");
    if (fresh.status === "deployed") return "already" as const;
    if (
      (fresh.status !== "preview_ready" && fresh.status !== "deploying") ||
      fresh.headSha !== head.sha
    ) {
      throw new BuildError(409, "Build state changed; re-run reconcile.");
    }
    tx.update(ref, {
      status: "deploying",
      updatedAt: new Date() as unknown as ModuleBuildDoc["updatedAt"],
    });
    return "claimed" as const;
  });
  if (claimed === "already") {
    return (await loadModuleBuild(build.id))!;
  }

  try {
    const merged = await mergePullRequest({
      number: build.pullRequestNumber,
      sha: head.sha,
    });
    if (!merged.merged) {
      throw new BuildError(409, "GitHub declined to merge the pull request.");
    }
    const mergeSha = merged.sha ?? head.sha;
    await saveModuleBuild(build.id, {
      mergeCommitSha: mergeSha,
      deployedSha: mergeSha,
    });
    await writeAuditLog({
      entityType: "module_build",
      entityId: build.id,
      action: "merged_awaiting_production",
      actorUid: actor.uid,
      actorName: actor.name,
      actorRole: actor.role,
      detail: { sha: mergeSha },
    });
    return (await loadModuleBuild(build.id))!;
  } catch (error) {
    const reason =
      error instanceof Error ? error.message : "Deployment merge failed.";
    await saveModuleBuild(build.id, {
      status: "failed",
      failureReason: reason.slice(0, 1900),
    });
    await writeAuditLog({
      entityType: "module_build",
      entityId: build.id,
      action: "deploy_failed",
      actorUid: actor.uid,
      actorName: actor.name,
      actorRole: actor.role,
      detail: { message: reason.slice(0, 500) },
    });
    throw error;
  }
}

export function serializeModuleBuild(build: ModuleBuildDoc) {
  return serializeDoc({ ...build });
}
