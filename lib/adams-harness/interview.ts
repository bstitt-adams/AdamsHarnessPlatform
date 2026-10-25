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
  const attachmentSection =
    interview.attachments && interview.attachments.length > 0
      ? [
          "Uploaded & analyzed attachments:",
          ...interview.attachments.map(
            (att) =>
              `- [${att.fileType.toUpperCase()}] ${att.fileName}: ${att.summary}\n  Extracted details:\n${att.extractedText.slice(0, 2500)}`,
          ),
        ].join("\n")
      : "Uploaded & analyzed attachments: (none)";

  return [
    `Interview title: ${interview.title}`,
    `Respondent: ${interview.respondentName || interview.createdByName || "Not provided"}`,
    `Seeded task: ${interview.task || "(none)"}`,
    `Topics already covered: ${covered.join(", ") || "none"}`,
    `Topics still missing: ${missing.join(", ") || "none"}`,
    `Unresolved questions: ${interview.unresolvedQuestions.join(" | ") || "none"}`,
    attachmentSection,
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

const GUIDED_QUESTIONS: {
  key: (typeof REQUIRED_COVERAGE_KEYS)[number];
  question: string;
  applyAnswer: (answer: string, current: InterviewFacts) => Partial<InterviewFacts>;
}[] = [
  {
    key: "task",
    question:
      "To get started, what specific process or workflow in your department are we streamlining, and what is its main goal?",
    applyAnswer: (a) => ({ task: a }),
  },
  {
    key: "trigger",
    question:
      "What triggers this process to start today, and how frequently does it happen (daily, weekly, per jobsite event)?",
    applyAnswer: (a) => ({ trigger: a, frequency: a }),
  },
  {
    key: "currentSteps",
    question:
      "Walk me through the current step-by-step process from start to finish. How does the work move from person to person today?",
    applyAnswer: (a) => ({
      currentSteps: a
        .split(/\n|;|\. /)
        .map((s) => s.trim())
        .filter(Boolean),
    }),
  },
  {
    key: "actors",
    question:
      "Who are all the people or roles involved in this process (e.g., foremen, safety superintendents, project managers, office admins)?",
    applyAnswer: (a) => ({
      actors: a
        .split(/,|\n|;/)
        .map((s) => s.trim())
        .filter(Boolean),
    }),
  },
  {
    key: "systems",
    question:
      "What systems, spreadsheets, email threads, text messages, or paper forms are currently used to run this process, and is any data copied manually between them?",
    applyAnswer: (a) => ({
      systems: a
        .split(/,|\n|;/)
        .map((s) => s.trim())
        .filter(Boolean),
      copiedData: [a],
    }),
  },
  {
    key: "painPoints",
    question:
      "Where does this process break down today? What are the biggest pain points, delays, or missed items?",
    applyAnswer: (a) => ({
      painPoints: a
        .split(/\n|;|\. /)
        .map((s) => s.trim())
        .filter(Boolean),
    }),
  },
  {
    key: "desiredProcess",
    question:
      "In the ideal Adams Platform solution, how should this workflow run from beginning to end?",
    applyAnswer: (a) => ({ desiredProcess: a }),
  },
  {
    key: "notifications",
    question:
      "Who needs to be notified at each stage (assignment, reminder, completion), and should alerts go via In-App, Telegram, Microsoft Teams, or Email?",
    applyAnswer: (a) => ({
      notifications: a
        .split(/\n|;|\. /)
        .map((s) => s.trim())
        .filter(Boolean),
    }),
  },
  {
    key: "completionEvidence",
    question:
      "What evidence proves that an item in this process is truly complete (e.g., uploaded photos, VIN/serial number, sign-off signature, checklist)?",
    applyAnswer: (a) => ({
      completionEvidence: a
        .split(/,|\n|;/)
        .map((s) => s.trim())
        .filter(Boolean),
    }),
  },
  {
    key: "timingEscalation",
    question:
      "What are the expected turnaround times or due dates, and who should be escalated to if an item becomes overdue?",
    applyAnswer: (a) => ({ timingEscalation: a }),
  },
  {
    key: "exceptions",
    question:
      "What exceptions, urgent edge cases, or field conditions need special handling in this workflow?",
    applyAnswer: (a) => ({
      exceptions: a
        .split(/\n|;|\. /)
        .map((s) => s.trim())
        .filter(Boolean),
    }),
  },
  {
    key: "compliance",
    question:
      "Are there any safety, OSHA, NFPA 70E, general contractor, or audit compliance requirements this solution must enforce?",
    applyAnswer: (a) => ({
      compliance: a
        .split(/\n|;|\. /)
        .map((s) => s.trim())
        .filter(Boolean),
    }),
  },
  {
    key: "integrations",
    question:
      "Does this solution need to connect to or expose API data to any other Adams Electric systems, calendars, or external tools?",
    applyAnswer: (a) => ({
      integrations: a
        .split(/,|\n|;/)
        .map((s) => s.trim())
        .filter(Boolean),
    }),
  },
  {
    key: "humanApprovals",
    question:
      "Finally, which steps require a human supervisor or department owner approval before moving forward?",
    applyAnswer: (a) => ({
      humanApprovals: a
        .split(/\n|;|\. /)
        .map((s) => s.trim())
        .filter(Boolean),
    }),
  },
];

function runGuidedFallbackTurn(interview: ProcessInterviewDoc): InterviewTurnResult {
  const coverage: Record<string, boolean> = { ...interview.coverage, department: true };
  let facts = { ...interview.facts };

  // Seed task if provided on interview creation
  if (interview.task && !facts.task) {
    facts = mergeFacts(facts, { task: interview.task });
    coverage.task = true;
  }

  // If the last message was from the user, attribute their answer to the first uncovered topic
  const lastMsg = interview.messages[interview.messages.length - 1];
  const justUploadedAttachment =
    lastMsg &&
    lastMsg.role === "user" &&
    lastMsg.content.startsWith("[Attachment Uploaded:");

  if (lastMsg && lastMsg.role === "user" && !justUploadedAttachment) {
    const answeredStep = GUIDED_QUESTIONS.find((q) => !coverage[q.key]);
    if (answeredStep) {
      const extracted = answeredStep.applyAnswer(lastMsg.content, facts);
      facts = mergeFacts(facts, extracted);
      coverage[answeredStep.key] = true;
    }
  }

  // Check if any uploaded attachment has follow-up questions not yet asked by the assistant
  const assistantHistoryText = interview.messages
    .filter((m) => m.role === "assistant")
    .map((m) => m.content)
    .join("\n");

  const pendingAttachmentQuestion = (interview.attachments || [])
    .flatMap((att) =>
      (att.suggestedQuestions || []).map((q) => ({
        fileName: att.fileName,
        summary: att.summary,
        question: q,
      })),
    )
    .find((item) => !assistantHistoryText.includes(item.question));

  const nextStep = GUIDED_QUESTIONS.find((q) => !coverage[q.key]);
  const readyForSpecification = !pendingAttachmentQuestion && !nextStep;

  let assistantText: string;
  if (justUploadedAttachment && pendingAttachmentQuestion) {
    assistantText = `I analyzed **${pendingAttachmentQuestion.fileName}**:\n${pendingAttachmentQuestion.summary}\n\n**Follow-up question on your attachment:** ${pendingAttachmentQuestion.question}`;
  } else if (pendingAttachmentQuestion) {
    assistantText = `Regarding your uploaded file **${pendingAttachmentQuestion.fileName}**: ${pendingAttachmentQuestion.question}`;
  } else if (nextStep) {
    assistantText = nextStep.question;
  } else {
    assistantText =
      "Thank you — all 15 required discovery topics and attachment follow-up questions are now covered! You can click 'Generate Specification' below to compile the versioned Solution Specification and launch your Solution App Workspace.";
  }

  const turn: InterviewAssistantTurn = {
    assistantMessage: assistantText,
    facts,
    coverage,
    unresolvedQuestions: [],
    readyForSpecification,
  };

  return {
    assistantMessage: newMessage("assistant", assistantText),
    turn,
    facts,
    coverage,
    unresolvedQuestions: [],
    readyForSpecification,
    model: "adams-guided-interviewer",
  };
}

export async function runInterviewTurn(
  interview: ProcessInterviewDoc,
): Promise<InterviewTurnResult> {
  const history = interview.messages.slice(-MAX_HISTORY_MESSAGES).map((m) => ({
    role: m.role,
    content: m.content,
  }));

  try {
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
  } catch {
    return runGuidedFallbackTurn(interview);
  }
}
