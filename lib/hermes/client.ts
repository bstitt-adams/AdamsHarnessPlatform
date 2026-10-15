import { z } from "zod";

const DEFAULT_MODEL = "hermes-agent";
const REQUEST_TIMEOUT_MS = 60_000;

export class HermesError extends Error {
  constructor(
    public readonly kind: "not_configured" | "upstream" | "invalid_response",
    message: string,
  ) {
    super(message);
    this.name = "HermesError";
  }
}

export type HermesStructuredRequest<T> = {
  systemPrompt: string;
  messages: { role: "user" | "assistant"; content: string }[];
  schema: z.ZodType<T>;
  temperature?: number;
};

export type HermesResolvedConfig = {
  url: string;
  apiKey: string;
  model: string;
  apiRoot: string;
};

export function buildHermesConfig(baseUrl: string, apiKey: string, model: string): HermesResolvedConfig {
  const trimmed = baseUrl.trim().replace(/\/+$/, "");
  const apiRoot = trimmed.endsWith("/v1/chat/completions")
    ? trimmed.slice(0, -"/v1/chat/completions".length)
    : trimmed.endsWith("/v1")
      ? trimmed.slice(0, -"/v1".length)
      : trimmed;
  return { url: `${apiRoot}/v1/chat/completions`, apiKey, model, apiRoot };
}

function getEnvHermesConfig(): HermesResolvedConfig | null {
  const baseUrl = process.env.HERMES_API_URL?.trim();
  const apiKey = process.env.HERMES_API_KEY?.trim();
  const model = process.env.HERMES_MODEL?.trim() || DEFAULT_MODEL;
  if (!baseUrl || !apiKey) return null;
  return buildHermesConfig(baseUrl, apiKey, model);
}

interface StoredHermesSettings {
  mode?: "local" | "remote" | "env";
  localUrl?: string;
  remoteUrl?: string;
  model?: string;
}

interface StoredHermesSecret {
  apiKey?: string;
}

/**
 * Resolves the active Hermes endpoint: stored platform settings take
 * precedence when mode is "local" or "remote"; otherwise env vars
 * (HERMES_API_URL / HERMES_API_KEY / HERMES_MODEL) are used.
 */
export async function resolveHermesConfig(): Promise<HermesResolvedConfig | null> {
  const env = getEnvHermesConfig();
  try {
    const { adminDb } = await import("@/lib/firebase-admin");
    if (!adminDb) return env;
    const [settingsSnap, secretSnap] = await Promise.all([
      adminDb.collection("platformSettings").doc("global").get(),
      adminDb.collection("platformSecrets").doc("hermes").get(),
    ]);
    const stored = settingsSnap.data()?.hermes as StoredHermesSettings | undefined;
    const secret = secretSnap.data() as StoredHermesSecret | undefined;
    if (stored && stored.mode !== "env") {
      const baseUrl = (stored.mode === "local" ? stored.localUrl : stored.remoteUrl)?.trim();
      const apiKey = secret?.apiKey?.trim() || env?.apiKey;
      if (baseUrl && apiKey) {
        return buildHermesConfig(
          baseUrl,
          apiKey,
          stored.model?.trim() || env?.model || DEFAULT_MODEL,
        );
      }
    }
  } catch {
    // Fall through to env config when settings are unavailable.
  }
  return env;
}

/** Ping an OpenAI-compatible Hermes endpoint. Used by the admin test route. */
export async function pingHermes(config: HermesResolvedConfig): Promise<{
  ok: boolean;
  status?: number;
  latencyMs: number;
  model: string;
  error?: string;
}> {
  const started = Date.now();
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (config.apiKey) headers.Authorization = `Bearer ${config.apiKey}`;
    const response = await fetch(config.url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: config.model,
        messages: [{ role: "user", content: "ping" }],
        max_tokens: 8,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    return {
      ok: response.ok,
      status: response.status,
      latencyMs: Date.now() - started,
      model: config.model,
      ...(response.ok ? {} : { error: `status_${response.status}` }),
    };
  } catch {
    return { ok: false, latencyMs: Date.now() - started, model: config.model, error: "unreachable" };
  }
}

function stripFencedJson(content: string): string {
  const trimmed = content.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/i);
  return fenced ? fenced[1].trim() : trimmed;
}

export async function requestHermesStructured<T>(
  input: HermesStructuredRequest<T>,
): Promise<{ data: T; model: string }> {
  const config = await resolveHermesConfig();
  if (!config) {
    throw new HermesError(
      "not_configured",
      "Hermes is not configured. Set the endpoint in Portal Settings → Hermes, or set HERMES_API_URL and HERMES_API_KEY.",
    );
  }

  let response: Response;
  try {
    response = await fetch(config.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: "system", content: input.systemPrompt },
          ...input.messages,
        ],
        temperature: input.temperature ?? 0.2,
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new HermesError(
      "upstream",
      "Hermes request failed or timed out.",
    );
  }

  if (!response.ok) {
    throw new HermesError(
      "upstream",
      `Hermes returned an error (status ${response.status}).`,
    );
  }

  let raw: unknown;
  try {
    raw = await response.json();
  } catch {
    throw new HermesError("invalid_response", "Hermes returned non-JSON response.");
  }

  const envelope = z
    .object({
      choices: z.array(
        z.object({ message: z.object({ content: z.string() }) }),
      ),
      model: z.string().optional(),
    })
    .safeParse(raw);

  const content = envelope.success
    ? envelope.data.choices[0]?.message?.content
    : undefined;

  if (!content) {
    throw new HermesError(
      "invalid_response",
      "Hermes response did not contain message content.",
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripFencedJson(content));
  } catch {
    throw new HermesError(
      "invalid_response",
      "Hermes message content was not valid JSON.",
    );
  }

  const validated = input.schema.safeParse(parsed);
  if (!validated.success) {
    throw new HermesError(
      "invalid_response",
      "Hermes response failed schema validation.",
    );
  }

  return {
    data: validated.data,
    model: (envelope.success && envelope.data.model) || config.model,
  };
}

export async function getHermesHealth(): Promise<{
  configured: boolean;
  healthy: boolean;
  model?: string;
  error?: string;
}> {
  const config = await resolveHermesConfig();
  if (!config) {
    return { configured: false, healthy: false, error: "not_configured" };
  }

  try {
    const response = await fetch(config.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [{ role: "user", content: "ping" }],
        max_tokens: 8,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    return {
      configured: true,
      healthy: response.ok,
      model: config.model,
      ...(response.ok ? {} : { error: `status_${response.status}` }),
    };
  } catch {
    return { configured: true, healthy: false, model: config.model, error: "unreachable" };
  }
}

const runStatusSchema = z.enum([
  "queued",
  "running",
  "awaiting_approval",
  "completed",
  "failed",
  "cancelled",
]);
export type HermesRunStatus = z.infer<typeof runStatusSchema>;

function hermesApiUrl(config: { apiRoot: string }, path: string): string {
  return `${config.apiRoot}${path}`;
}

export async function startHermesRun(input: {
  prompt: string;
  instructions: string;
  idempotencyKey: string;
  sessionId?: string;
}): Promise<{ runId: string }> {
  const config = await resolveHermesConfig();
  if (!config) {
    throw new HermesError("not_configured", "Hermes is not configured.");
  }

  let response: Response;
  try {
    response = await fetch(hermesApiUrl(config, "/v1/runs"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
        "Idempotency-Key": input.idempotencyKey,
      },
      body: JSON.stringify({
        input: input.prompt,
        instructions: input.instructions,
        ...(input.sessionId ? { session_id: input.sessionId } : {}),
      }),
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    throw new HermesError("upstream", "Hermes run request failed or timed out.");
  }

  if (response.status !== 202 && !response.ok) {
    throw new HermesError(
      "upstream",
      `Hermes run rejected (status ${response.status}).`,
    );
  }

  let raw: unknown;
  try {
    raw = await response.json();
  } catch {
    throw new HermesError("invalid_response", "Hermes run returned non-JSON response.");
  }
  const parsed = z
    .object({
      id: z.string().optional(),
      run_id: z.string().optional(),
      runId: z.string().optional(),
    })
    .safeParse(raw);
  const runId = parsed.success
    ? parsed.data.id ?? parsed.data.run_id ?? parsed.data.runId
    : undefined;
  if (!runId) {
    throw new HermesError("invalid_response", "Hermes run response missing run id.");
  }
  return { runId };
}

export async function getHermesRun(runId: string): Promise<{
  status: HermesRunStatus;
  finalResponse?: string;
  error?: string;
}> {
  const config = await resolveHermesConfig();
  if (!config) {
    throw new HermesError("not_configured", "Hermes is not configured.");
  }

  let response: Response;
  try {
    response = await fetch(
      hermesApiUrl(config, `/v1/runs/${encodeURIComponent(runId)}`),
      {
        headers: { Authorization: `Bearer ${config.apiKey}` },
        signal: AbortSignal.timeout(15_000),
      },
    );
  } catch {
    throw new HermesError("upstream", "Hermes run status request failed or timed out.");
  }

  if (!response.ok) {
    throw new HermesError(
      "upstream",
      `Hermes run status failed (status ${response.status}).`,
    );
  }

  let raw: unknown;
  try {
    raw = await response.json();
  } catch {
    throw new HermesError("invalid_response", "Hermes run status returned non-JSON.");
  }
  const parsed = z
    .object({
      status: runStatusSchema,
      final_response: z.string().optional(),
      finalResponse: z.string().optional(),
      error: z.string().optional(),
    })
    .safeParse(raw);
  if (!parsed.success) {
    throw new HermesError("invalid_response", "Hermes run status failed validation.");
  }
  return {
    status: parsed.data.status,
    finalResponse: parsed.data.final_response ?? parsed.data.finalResponse,
    error: parsed.data.error,
  };
}
