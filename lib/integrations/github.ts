import { createHmac, timingSafeEqual } from "crypto";
import { z } from "zod";

const API_VERSION = "2022-11-28";
const REQUEST_TIMEOUT_MS = 20_000;
const CONTENT_SIZE_CAP = 200 * 1024;
const REPOSITORY_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

export class GitHubError extends Error {
  constructor(
    public readonly kind: "not_configured" | "upstream" | "invalid_response",
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "GitHubError";
  }
}

function getGitHubConfig():
  | { configured: true; token: string; owner: string; repo: string; baseBranch: string }
  | { configured: false } {
  const token = process.env.GITHUB_TOKEN?.trim();
  const repository = process.env.GITHUB_REPOSITORY?.trim();
  const baseBranch = process.env.GITHUB_BASE_BRANCH?.trim() || "main";
  if (!token || !repository || !REPOSITORY_PATTERN.test(repository)) {
    return { configured: false };
  }
  const [owner, repo] = repository.split("/", 2);
  if (!owner || !repo) return { configured: false };
  return { configured: true, token, owner, repo, baseBranch };
}

export function getGitHubBaseBranch(): string {
  return process.env.GITHUB_BASE_BRANCH?.trim() || "main";
}

async function ghFetch<T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const config = getGitHubConfig();
  if (!config.configured) {
    throw new GitHubError("not_configured", "GitHub integration is not configured.");
  }
  const url = `https://api.github.com/repos/${config.owner}/${config.repo}${path}`;
  let response: Response;
  try {
    response = await fetch(url, {
      method: options.method ?? "GET",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${config.token}`,
        "X-GitHub-Api-Version": API_VERSION,
        ...(options.body !== undefined
          ? { "Content-Type": "application/json" }
          : {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new GitHubError("upstream", "GitHub request failed or timed out.");
  }
  if (!response.ok) {
    throw new GitHubError(
      "upstream",
      `GitHub request failed (status ${response.status}).`,
      response.status,
    );
  }
  return (await response.json()) as T;
}

const branchSchema = z.object({
  name: z.string(),
  commit: z.object({ sha: z.string().regex(/^[a-f0-9]{40}$/i) }),
});

export async function getBranchHead(
  branch: string,
): Promise<{ sha: string } | null> {
  let raw: unknown;
  try {
    raw = await ghFetch<unknown>(`/branches/${encodeURIComponent(branch)}`);
  } catch (error) {
    if (error instanceof GitHubError && error.status === 404) return null;
    throw error;
  }
  const parsed = branchSchema.safeParse(raw);
  if (!parsed.success) {
    throw new GitHubError("invalid_response", "GitHub branch response invalid.");
  }
  return { sha: parsed.data.commit.sha };
}

const compareSchema = z.object({
  files: z
    .array(z.object({ filename: z.string(), status: z.string() }))
    .max(500)
    .optional(),
});

export async function compareCommits(
  base: string,
  head: string,
): Promise<{ files: { filename: string; status: string }[] }> {
  const raw = await ghFetch<unknown>(
    `/compare/${encodeURIComponent(base)}...${encodeURIComponent(head)}`,
  );
  const parsed = compareSchema.safeParse(raw);
  if (!parsed.success) {
    throw new GitHubError("invalid_response", "GitHub compare response invalid.");
  }
  return { files: parsed.data.files ?? [] };
}

const fileContentSchema = z.object({
  type: z.literal("file"),
  encoding: z.string(),
  content: z.string(),
  size: z.number().int().nonnegative(),
  path: z.string(),
});

export async function getFileContent(
  path: string,
  ref: string,
): Promise<string | null> {
  let raw: unknown;
  try {
    raw = await ghFetch<unknown>(
      `/contents/${path}?ref=${encodeURIComponent(ref)}`,
    );
  } catch (error) {
    if (error instanceof GitHubError && error.status === 404) return null;
    throw error;
  }
  const parsed = fileContentSchema.safeParse(raw);
  if (!parsed.success) {
    throw new GitHubError("invalid_response", "GitHub contents response invalid.");
  }
  if (parsed.data.size > CONTENT_SIZE_CAP) {
    throw new GitHubError("invalid_response", "GitHub file exceeds size cap.");
  }
  if (parsed.data.encoding === "base64") {
    return Buffer.from(parsed.data.content.replace(/\s/g, ""), "base64").toString(
      "utf8",
    );
  }
  return parsed.data.content;
}

const pullRequestSchema = z.object({
  number: z.number().int().positive(),
  state: z.string(),
  merged: z.boolean(),
  html_url: z.string().url(),
  head: z.object({ sha: z.string() }),
  merge_commit_sha: z.string().nullable(),
});

export interface GitHubPullRequest {
  number: number;
  state: string;
  merged: boolean;
  headSha: string;
  mergeCommitSha?: string;
  htmlUrl: string;
}

function parsePullRequest(raw: unknown): GitHubPullRequest {
  const parsed = pullRequestSchema.safeParse(raw);
  if (!parsed.success) {
    throw new GitHubError("invalid_response", "GitHub pull request invalid.");
  }
  return {
    number: parsed.data.number,
    state: parsed.data.state,
    merged: parsed.data.merged,
    headSha: parsed.data.head.sha,
    mergeCommitSha: parsed.data.merge_commit_sha ?? undefined,
    htmlUrl: parsed.data.html_url,
  };
}

export async function getPullRequest(
  number: number,
): Promise<GitHubPullRequest> {
  const raw = await ghFetch<unknown>(`/pulls/${number}`);
  return parsePullRequest(raw);
}

export interface NormalizedCheck {
  name: string;
  status: string;
  conclusion: string | null;
  url?: string;
}

const checkRunsSchema = z.object({
  check_runs: z.array(
    z.object({
      name: z.string(),
      status: z.string(),
      conclusion: z.string().nullable(),
      html_url: z.string().optional(),
      details_url: z.string().optional(),
      started_at: z.string().nullable().optional(),
      completed_at: z.string().nullable().optional(),
      app: z.object({ slug: z.string() }).optional(),
    }),
  ),
});

const commitStatusSchema = z.object({
  statuses: z.array(
    z.object({
      context: z.string(),
      state: z.string(),
      target_url: z.string().nullable(),
      created_at: z.string().optional(),
      updated_at: z.string().optional(),
    }),
  ),
});

function isVercelCheck(name: string, url?: string | null): boolean {
  const haystack = `${name} ${url ?? ""}`.toLowerCase();
  return haystack.includes("vercel");
}

function isVercelProductionCheck(name: string, url?: string | null): boolean {
  const haystack = `${name} ${url ?? ""}`.toLowerCase();
  return haystack.includes("vercel") && haystack.includes("production");
}

function normalizeCheckName(name: string): string {
  return name.trim().toLowerCase();
}

export async function listCommitChecks(sha: string): Promise<{
  checks: NormalizedCheck[];
  previewUrl?: string;
}> {
  const [runs, statuses] = await Promise.all([
    ghFetch<unknown>(`/commits/${encodeURIComponent(sha)}/check-runs?per_page=100`),
    ghFetch<unknown>(`/commits/${encodeURIComponent(sha)}/status?per_page=100`),
  ]);

  const deduped = new Map<string, { check: NormalizedCheck; sortKey: string }>();
  const put = (check: NormalizedCheck, sortKey: string) => {
    const key = normalizeCheckName(check.name);
    const existing = deduped.get(key);
    if (!existing || existing.sortKey <= sortKey) {
      deduped.set(key, { check, sortKey });
    }
  };

  const runsParsed = checkRunsSchema.safeParse(runs);
  if (runsParsed.success) {
    for (const run of runsParsed.data.check_runs) {
      put(
        {
          name: run.name,
          status: run.status,
          conclusion: run.conclusion,
          url: run.details_url ?? run.html_url,
        },
        run.completed_at ?? run.started_at ?? "",
      );
    }
  }

  const statusesParsed = commitStatusSchema.safeParse(statuses);
  if (statusesParsed.success) {
    for (const s of statusesParsed.data.statuses) {
      put(
        {
          name: s.context,
          status: s.state === "pending" ? "in_progress" : "completed",
          conclusion:
            s.state === "success" || s.state === "failure" || s.state === "error"
              ? s.state
              : null,
          url: s.target_url ?? undefined,
        },
        s.updated_at ?? s.created_at ?? "",
      );
    }
  }

  const checks = [...deduped.values()].map((entry) => entry.check);
  let previewUrl: string | undefined;
  for (const check of checks) {
    if (
      check.status === "completed" &&
      check.conclusion === "success" &&
      isVercelCheck(check.name, check.url) &&
      check.url &&
      /^https:\/\//.test(check.url) &&
      !isVercelProductionCheck(check.name, check.url)
    ) {
      previewUrl = check.url;
      break;
    }
  }
  return { checks, previewUrl };
}

const deploymentsSchema = z.array(
  z.object({
    id: z.number().int().positive(),
    environment: z.string(),
    sha: z.string(),
  }),
);

const deploymentStatusesSchema = z.array(
  z.object({
    id: z.number().int().positive(),
    state: z.string(),
    environment_url: z.string().nullable().optional(),
    target_url: z.string().nullable().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
  }),
);

export async function getProductionDeployUrl(
  sha: string,
): Promise<string | undefined> {
  const rawDeployments = await ghFetch<unknown>(
    `/deployments?sha=${encodeURIComponent(sha)}&environment=Production&per_page=20`,
  );
  const deployments = deploymentsSchema.safeParse(rawDeployments);
  if (deployments.success) {
    const candidates = deployments.data.filter(
      (d) =>
        d.environment.toLowerCase() === "production" &&
        d.sha.toLowerCase() === sha.toLowerCase(),
    );
    for (const deployment of candidates) {
      const rawStatuses = await ghFetch<unknown>(
        `/deployments/${deployment.id}/statuses?per_page=20`,
      );
      const statuses = deploymentStatusesSchema.safeParse(rawStatuses);
      if (!statuses.success) continue;
      const sorted = [...statuses.data].sort((a, b) => b.id - a.id);
      const newest = sorted[0];
      if (newest && newest.state === "success") {
        const url = newest.environment_url ?? newest.target_url;
        if (url && /^https:\/\//.test(url)) {
          return url;
        }
      }
    }
  }
  const { checks } = await listCommitChecks(sha);
  for (const check of checks) {
    if (
      check.status === "completed" &&
      check.conclusion === "success" &&
      isVercelProductionCheck(check.name, check.url) &&
      check.url &&
      /^https:\/\//.test(check.url)
    ) {
      return check.url;
    }
  }
  return undefined;
}

export async function ensurePullRequest(input: {
  head: string;
  base: string;
  title: string;
  body: string;
}): Promise<GitHubPullRequest> {
  const config = getGitHubConfig();
  if (!config.configured) {
    throw new GitHubError("not_configured", "GitHub integration is not configured.");
  }
  const existing = await ghFetch<unknown[]>(
    `/pulls?state=open&head=${encodeURIComponent(
      `${config.owner}:${input.head}`,
    )}&base=${encodeURIComponent(input.base)}&per_page=5`,
  );
  for (const raw of Array.isArray(existing) ? existing : []) {
    const parsed = pullRequestSchema.safeParse(raw);
    if (parsed.success) return parsePullRequest(parsed.data);
  }
  const created = await ghFetch<unknown>("/pulls", {
    method: "POST",
    body: {
      title: input.title,
      head: input.head,
      base: input.base,
      body: input.body,
    },
  });
  return parsePullRequest(created);
}

const mergeResultSchema = z.object({
  merged: z.boolean(),
  sha: z.string().optional(),
  message: z.string().optional(),
});

export async function mergePullRequest(input: {
  number: number;
  sha: string;
}): Promise<{ merged: boolean; sha?: string }> {
  const raw = await ghFetch<unknown>(`/pulls/${input.number}/merge`, {
    method: "PUT",
    body: { sha: input.sha, merge_method: "merge" },
  });
  const parsed = mergeResultSchema.safeParse(raw);
  if (!parsed.success) {
    throw new GitHubError("invalid_response", "GitHub merge response invalid.");
  }
  return { merged: parsed.data.merged === true, sha: parsed.data.sha };
}

export function verifyGitHubWebhook(
  rawBody: string | Buffer,
  signature: string | null | undefined,
): boolean {
  const secret = process.env.GITHUB_WEBHOOK_SECRET?.trim();
  if (!secret || !signature || !signature.startsWith("sha256=")) {
    return false;
  }
  const expected =
    "sha256=" + createHmac("sha256", secret).update(rawBody).digest("hex");
  const expectedBuf = Buffer.from(expected);
  const signatureBuf = Buffer.from(signature);
  if (expectedBuf.length !== signatureBuf.length) return false;
  return timingSafeEqual(expectedBuf, signatureBuf);
}

export async function getGitHubHealth(): Promise<{
  configured: boolean;
  healthy: boolean;
  repository?: string;
  error?: string;
}> {
  const config = getGitHubConfig();
  if (!config.configured) {
    return { configured: false, healthy: false, error: "not_configured" };
  }
  try {
    const response = await fetch(
      `https://api.github.com/repos/${config.owner}/${config.repo}`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${config.token}`,
          "X-GitHub-Api-Version": API_VERSION,
        },
        signal: AbortSignal.timeout(10_000),
      },
    );
    return {
      configured: true,
      healthy: response.ok,
      repository: `${config.owner}/${config.repo}`,
      ...(response.ok ? {} : { error: `status_${response.status}` }),
    };
  } catch {
    return { configured: true, healthy: false, error: "unreachable" };
  }
}
