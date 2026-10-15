import { randomUUID } from "crypto";
import {
  interviewAssistantTurnSchema,
  REQUIRED_COVERAGE_KEYS,
  type InterviewAssistantTurn,
  type InterviewFacts,
  type InterviewMessage,
  type ProcessInterviewDoc,
} from "./types";
import { requestHermesStructured } from "@/lib/hermes/client";

const MAX_HISTORY_MESSAGES = 40;

export { REQUIRED_COVERAGE_KEYS };
export type { InterviewFacts };

export function emptyInterviewFacts(): InterviewFacts {
  return {
    task: null,
    trigger: null,
    frequency: null,
    currentSteps: [],
    actors: [],
    systems: [],
    copiedData: [],
    painPoints: [],
    desiredProcess: null,
    notifications: [],
    completionEvidence: [],
    timingEscalation: null,
    exceptions: [],
    compliance: [],
    integrations: [],
    humanApprovals: [],
  };
}

export function emptyCoverage(departmentEstablished: boolean): Record<string, boolean> {
  const coverage: Record<string, boolean> = {};
  for (const key of REQUIRED_COVERAGE_KEYS) {
    coverage[key] = key === "department" ? departmentEstablished : false;
  }
  return coverage;
}

function uniqueUnion(existing: string[], incoming: string[] | undefined): string[] {
  if (!incoming || incoming.length === 0) return existing;
  const seen = new Set(existing.map((v) => v.toLowerCase()));
  const merged = [...existing];
  for (const value of incoming) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(trimmed);
    }
  }
  return merged;
}

function replaceIfProvided(
  existing: string | null,
  incoming: string | null | undefined,
): string | null {
  if (typeof incoming === "string" && incoming.trim().length > 0) {
    return incoming.trim();
  }
  return existing;
}

export function mergeFacts(
  existing: InterviewFacts,
  update: Partial<InterviewFacts>,
): InterviewFacts {
  return {
    task: replaceIfProvided(existing.task, update.task),
    trigger: replaceIfProvided(existing.trigger, update.trigger),
    frequency: replaceIfProvided(existing.frequency, update.frequency),
    currentSteps: uniqueUnion(existing.currentSteps, update.currentSteps),
    actors: uniqueUnion(existing.actors, update.actors),
    systems: uniqueUnion(existing.systems, update.systems),
    copiedData: uniqueUnion(existing.copiedData, update.copiedData),
    painPoints: uniqueUnion(existing.painPoints, update.painPoints),
    desiredProcess: replaceIfProvided(existing.desiredProcess, update.desiredProcess),
    notifications: uniqueUnion(existing.notifications, update.notifications),
    completionEvidence: uniqueUnion(existing.completionEvidence, update.completionEvidence),
    timingEscalation: replaceIfProvided(existing.timingEscalation, update.timingEscalation),
    exceptions: uniqueUnion(existing.exceptions, update.exceptions),
    compliance: uniqueUnion(existing.compliance, update.compliance),
    integrations: uniqueUnion(existing.integrations, update.integrations),
    humanApprovals: uniqueUnion(existing.humanApprovals, update.humanApprovals),
  };
}

export function mergeCoverage(
  existing: Record<string, boolean>,
  update: Record<string, boolean>,
): Record<string, boolean> {
  const merged: Record<string, boolean> = {};
  for (const key of REQUIRED_COVERAGE_KEYS) {
    merged[key] = key === "department" ? true : update[key] === true || existing[key] === true;
  }
  return merged;
}

export function computeReadiness(
  coverage: Record<string, boolean>,
  unresolvedQuestions: string[],
): boolean {
  return (
    REQUIRED_COVERAGE_KEYS.every((key) => coverage[key] === true) &&
    unresolvedQuestions.length === 0
  );
}

export function newMessage(role: "user" | "assistant", content: string): InterviewMessage {
  return {
    id: randomUUID(),
    role,
    content,
    createdAt: new Date().toISOString(),
  };
}

const SYSTEM_PROMPT = `You are the Adams Harness process interviewer. You interview a team member to capture everything needed to specify an internal software solution for one department process.

Rules:
- Ask exactly ONE focused question per turn in "assistantMessage".
- Cover all required topics: ${REQUIRED_COVERAGE_KEYS.join(", ")}.
- Extract structured facts from the conversation into "facts" (only report newly learned facts; arrays are merged, scalars replace).
- Update "coverage": mark a topic true only when it has been adequately answered.
- List concrete questions still blocking a complete specification in "unresolvedQuestions" (empty array when none).
- Set "readyForSpecification" true only when every topic is covered and nothing remains unresolved.
- The department is already established; keep "department" coverage true.

Respond with a single JSON object matching exactly:
{
  "assistantMessage": string,
  "facts": { "task": string|null, "trigger": string|null, "frequency": string|null, "currentSteps": string[], "actors": string[], "systems": string[], "copiedData": string[], "painPoints": string[], "desiredProcess": string|null, "notifications": string[], "completionEvidence": string[], "timingEscalation": string|null, "exceptions": string[], "compliance": string[], "integrations": string[], "humanApprovals": string[] },
  "coverage": { "<topic>": boolean },
  "unresolvedQuestions": string[],
  "readyForSpecification": boolean
}`;

function buildStateSummary(interview: ProcessInterviewDoc): string {
  const covered = REQUIRED_COVERAGE_KEYS.filter((k) => interview.coverage[k]);
  const missing = REQUIRED_COVERAGE_KEYS.filter((k) => !interview.coverage[k]);
  return [
    `Interview title: ${interview.title}`,
    `Seeded task: ${interview.task || "(none)"}`,
    `Topics already covered: ${covered.join(", ") || "none"}`,
    `Topics still missing: ${missing.join(", ") || "none"}`,
    `Unresolved questions: ${interview.unresolvedQuestions.join(" | ") || "none"}`,
  ].join("\n");
}

export type InterviewTurnResult = {
  assistantMessage: InterviewMessage;
  turn: InterviewAssistantTurn;
  facts: InterviewFacts;
  coverage: Record<string, boolean>;
  unresolvedQuestions: string[];
  readyForSpecification: boolean;
  model: string;
};

export async function runInterviewTurn(
  interview: ProcessInterviewDoc,
): Promise<InterviewTurnResult> {
  const history = interview.messages.slice(-MAX_HISTORY_MESSAGES).map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const { data, model } = await requestHermesStructured({
    systemPrompt: `${SYSTEM_PROMPT}\n\nCurrent interview state:\n${buildStateSummary(interview)}`,
    messages:
      history.length > 0
        ? history
        : [
            {
              role: "user",
              content:
                "Begin the interview. Ask your first question about the process described in the seeded task.",
            },
          ],
    schema: interviewAssistantTurnSchema,
    temperature: 0.3,
  });

  const facts = mergeFacts(interview.facts, data.facts);
  const coverage = mergeCoverage(interview.coverage, data.coverage);
  const unresolvedQuestions = data.unresolvedQuestions;
  const readyForSpecification = computeReadiness(coverage, unresolvedQuestions);

  return {
    assistantMessage: newMessage("assistant", data.assistantMessage),
    turn: data,
    facts,
    coverage,
    unresolvedQuestions,
    readyForSpecification,
    model,
  };
}
