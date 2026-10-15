import { createHash } from "crypto";
import {
  specificationSectionsSchema,
  type ProcessInterviewDoc,
  type SpecificationSections,
} from "./types";
import { REQUIRED_COVERAGE_KEYS } from "./interview";
import { requestHermesStructured } from "@/lib/hermes/client";

function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(",")}]`;
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  const entries = keys.map(
    (key) => `${JSON.stringify(key)}:${canonicalize(record[key])}`,
  );
  return `{${entries.join(",")}}`;
}

export function computeSpecificationHash(input: {
  interviewId: string;
  departmentId: string;
  version: number;
  sections: SpecificationSections;
}): string {
  const canonical = canonicalize({
    interviewId: input.interviewId,
    departmentId: input.departmentId,
    version: input.version,
    sections: input.sections,
  });
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}

const SPEC_SYSTEM_PROMPT = `You are the Adams Harness specification writer. Given a completed process interview (extracted facts and transcript), produce a structured solution specification for internal software.

Respond with a single JSON object matching exactly:
{
  "summary": string,
  "currentProcess": string,
  "futureProcess": string,
  "painPoints": string[],
  "roles": [{ "role": string, "responsibilities": string }],
  "dataEntities": [{ "name": string, "description": string }],
  "forms": [{ "name": string, "description": string }],
  "notifications": [{ "name": string, "description": string }],
  "integrations": [{ "name": string, "description": string }],
  "approvals": [{ "step": string, "approver": string, "condition": string }],
  "permissions": string,
  "auditRequirements": string[],
  "acceptanceCriteria": string[],
  "risks": string[],
  "outOfScope": string[]
}

Be specific and grounded in the interview facts. Do not invent systems, people, or requirements that were not discussed; if a required area was thin, reflect that honestly in risks or outOfScope.`;

function transcriptForPrompt(interview: ProcessInterviewDoc): string {
  const lines = interview.messages
    .slice(-60)
    .map((m) => `${m.role === "assistant" ? "Interviewer" : "User"}: ${m.content}`);
  return lines.join("\n");
}

export async function generateSpecificationSections(
  interview: ProcessInterviewDoc,
): Promise<{ sections: SpecificationSections; model: string }> {
  const covered = REQUIRED_COVERAGE_KEYS.filter((k) => interview.coverage[k]);
  const factsJson = JSON.stringify(interview.facts);

  const { data, model } = await requestHermesStructured({
    systemPrompt: SPEC_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          `Interview title: ${interview.title}`,
          `Covered topics: ${covered.join(", ")}`,
          `Extracted facts: ${factsJson}`,
          "",
          "Transcript:",
          transcriptForPrompt(interview),
        ].join("\n"),
      },
    ],
    schema: specificationSectionsSchema,
    temperature: 0.2,
  });

  return { sections: data, model };
}
