import { NextRequest } from "next/server";
import { COLLECTIONS } from "@/lib/schema";
import { getDb } from "@/lib/adams-harness/server-store";
import { ModuleBuildDoc } from "@/lib/adams-harness/types";
import { reconcileModuleBuild } from "@/lib/adams-harness/module-builds";
import { verifyGitHubWebhook } from "@/lib/integrations/github";

const HANDLED_EVENTS = new Set([
  "push",
  "check_run",
  "status",
  "deployment_status",
  "pull_request",
]);

function extractRefs(event: string, payload: Record<string, unknown>): string[] {
  const refs = new Set<string>();
  const sha = (v: unknown) =>
    typeof v === "string" && /^[a-f0-9]{40}$/i.test(v) ? v : undefined;
  const add = (v: string | undefined) => {
    if (v) refs.add(v);
  };

  if (event === "push") {
    add(sha(payload.after));
    const head = payload.head_commit as { id?: string } | undefined;
    add(sha(head?.id));
    const ref = typeof payload.ref === "string" ? payload.ref : "";
    if (ref.startsWith("refs/heads/")) refs.add(ref.slice("refs/heads/".length));
  }
  const checkRun = payload.check_run as
    | { head_sha?: string; check_suite?: { head_branch?: string } }
    | undefined;
  if (checkRun) {
    add(sha(checkRun.head_sha));
    if (checkRun.check_suite?.head_branch) refs.add(checkRun.check_suite.head_branch);
  }
  const status = payload as { sha?: string; branches?: { name?: string }[] };
  if (event === "status") {
    add(sha(status.sha));
    for (const b of status.branches ?? []) if (b.name) refs.add(b.name);
  }
  const deployment = payload.deployment as
    | { sha?: string; ref?: string }
    | undefined;
  if (event === "deployment_status" && deployment) {
    add(sha(deployment.sha));
    if (deployment.ref) refs.add(deployment.ref);
  }
  const pr = payload.pull_request as
    | { head?: { sha?: string; ref?: string } }
    | undefined;
  if (event === "pull_request" && pr?.head) {
    add(sha(pr.head.sha));
    if (pr.head.ref) refs.add(pr.head.ref);
  }
  return [...refs];
}

export async function POST(request: NextRequest) {
  const signature = request.headers.get("x-hub-signature-256");
  const event = request.headers.get("x-github-event") ?? "";
  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return Response.json({ error: "Invalid body." }, { status: 400 });
  }
  if (!verifyGitHubWebhook(rawBody, signature)) {
    return Response.json({ error: "Invalid signature." }, { status: 401 });
  }
  if (!HANDLED_EVENTS.has(event)) {
    return Response.json({ ok: true, ignored: true });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const refs = extractRefs(event, payload);
  if (refs.length > 0) {
    try {
      const snap = await getDb().collection(COLLECTIONS.MODULE_BUILDS).get();
      const builds = snap.docs
        .map((d) => d.data() as ModuleBuildDoc)
        .filter(
          (b) =>
            !["deployed", "failed"].includes(b.status) &&
            (refs.includes(b.branch) ||
              (b.headSha !== undefined && refs.includes(b.headSha)) ||
              (b.mergeCommitSha !== undefined && refs.includes(b.mergeCommitSha))),
        )
        .slice(0, 10);
      await Promise.all(
        builds.map((b) =>
          reconcileModuleBuild(b.id).catch(() => undefined),
        ),
      );
    } catch (error) {
      console.error("Webhook reconcile error:", error);
    }
  }
  return Response.json({ ok: true });
}
