import { randomUUID } from "crypto";
import { z } from "zod";
import {
  interviewAssistantTurnSchema,
  interviewFactsSchema,
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

export const READY_FOR_PRD_MESSAGE =
  "Thank you — I now have enough information to create the Product Requirements Document (PRD) for your request. " +
  "The PRD is being generated and your interview has been submitted to the Adams Electric team. " +
  "A team member will review it and follow up with you on your request.";

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

const interviewYoloSchema = z.strictObject({
  assistantMessage: z.string().trim().min(1).max(10_000),
  facts: interviewFactsSchema.partial().default({}),
});

const YOLO_SYSTEM_PROMPT = `You are the Adams Platform requirements interview autopilot. The respondent entered "yolo" and asked you to finish the interview using recommended best-practice answers.

Return one JSON object:
{
  "assistantMessage": string,
  "facts": { partial InterviewFacts object }
}

Rules:
- Infer a realistic, operationally sound workflow from the existing interview title, respondent, attachments, and conversation.
- In "assistantMessage", provide a concise numbered list of the recommended answers you are applying, grouped by missing discovery topic.
- Populate "facts" for every uncovered required topic. Do not invent personally sensitive data, credentials, or unsupported integrations.
- Use Adams Electric/electrical-construction best practices: clear role ownership, audit trail, notifications, escalation, evidence, compliance, exceptions, integrations, and human approvals.
- The assistantMessage must end by telling the respondent the requirements are ready for PRD generation.`;

function fallbackYoloFacts(interview: ProcessInterviewDoc): InterviewFacts {
  const task = interview.facts.task || interview.task || "Department workflow automation";
  return {
    task,
    trigger: interview.facts.trigger || "The process starts when a work request, jobsite event, schedule milestone, or recurring operational need is identified.",
    frequency: interview.facts.frequency || "As needed, with recurring checkpoints for open items and overdue work.",
    currentSteps: interview.facts.currentSteps.length ? interview.facts.currentSteps : [
      "Request or work item is identified and captured.",
      "A coordinator enters or forwards the information through spreadsheets, email, chat, or paper forms.",
      "Responsible team members complete the work and report progress manually.",
      "A supervisor reviews completion and follows up on missing or overdue items.",
    ],
    actors: interview.facts.actors.length ? interview.facts.actors : [
      "Requestor or process owner",
      "Department coordinator",
      "Assigned field or office team member",
      "Supervisor or department approver",
    ],
    systems: interview.facts.systems.length ? interview.facts.systems : [
      "Adams Platform",
      "Email",
      "Spreadsheets",
      "Microsoft Teams or Telegram notifications where configured",
    ],
    copiedData: interview.facts.copiedData.length ? interview.facts.copiedData : [
      "Request details, assignee, due date, status, evidence, and completion notes should be captured once and reused across the workflow.",
    ],
    painPoints: interview.facts.painPoints.length ? interview.facts.painPoints : [
      "Manual follow-up",
      "Duplicated data entry",
      "Unclear ownership",
      "Delayed completion evidence",
      "Limited visibility into overdue work",
    ],
    desiredProcess: interview.facts.desiredProcess || "Create a structured Adams Platform workflow that captures the request once, assigns an owner, tracks status and due dates, collects evidence, notifies stakeholders, escalates overdue items, and preserves an audit trail.",
    notifications: interview.facts.notifications.length ? interview.facts.notifications : [
      "Notify the assignee when work is assigned.",
      "Notify the requester and supervisor when status changes or work is completed.",
      "Escalate overdue work to the department owner.",
    ],
    completionEvidence: interview.facts.completionEvidence.length ? interview.facts.completionEvidence : [
      "Completion notes",
      "Required attachments or photos where applicable",
      "Supervisor sign-off for regulated or high-risk items",
    ],
    timingEscalation: interview.facts.timingEscalation || "Use process-specific due dates, remind assignees before the deadline, and escalate overdue items to the supervisor or department owner.",
    exceptions: interview.facts.exceptions.length ? interview.facts.exceptions : [
      "Urgent safety issues are prioritized immediately.",
      "Missing information returns the item to the requester or coordinator.",
      "Blocked work requires a documented reason and owner.",
    ],
    compliance: interview.facts.compliance.length ? interview.facts.compliance : [
      "Preserve user, timestamp, status, approval, attachment, and change-history records for auditability.",
    ],
    integrations: interview.facts.integrations.length ? interview.facts.integrations : [
      "Reuse Team Members, departments, business units, assets, and notification services already available in the Adams Platform.",
    ],
    humanApprovals: interview.facts.humanApprovals.length ? interview.facts.humanApprovals : [
      "Department owner or supervisor approval before completion when required.",
    ],
  };
}

export async function runInterviewYolo(
  interview: ProcessInterviewDoc,
): Promise<InterviewTurnResult> {
  const missing = REQUIRED_COVERAGE_KEYS.filter((key) => !interview.coverage[key]);
  let facts = mergeFacts(interview.facts, fallbackYoloFacts(interview));
  let assistantText = "I'll finish the interview using recommended Adams Platform best practices.";

  try {
    const { data, model } = await requestHermesStructured({
      systemPrompt: `${YOLO_SYSTEM_PROMPT}\n\nCurrent interview state:\n${buildStateSummary(interview)}\n\nMissing topics: ${missing.join(", ") || "none"}`,
      messages: interview.messages.slice(-MAX_HISTORY_MESSAGES).map((m) => ({ role: m.role, content: m.content })),
      schema: interviewYoloSchema,
      temperature: 0.35,
    });
    facts = mergeFacts(facts, data.facts);
    assistantText = data.assistantMessage;
    return {
      assistantMessage: newMessage("assistant", assistantText),
      turn: {
        assistantMessage: assistantText,
        facts: data.facts,
        coverage: Object.fromEntries(REQUIRED_COVERAGE_KEYS.map((key) => [key, true])),
        unresolvedQuestions: [],
        readyForSpecification: true,
      },
      facts,
      coverage: Object.fromEntries(REQUIRED_COVERAGE_KEYS.map((key) => [key, true])),
      unresolvedQuestions: [],
      readyForSpecification: true,
      model,
    };
  } catch {
    const fallbackMessage = [
      "I could not reach the AI assistant, so I applied standard Adams Platform best-practice recommendations to complete the interview:",
      "1. Capture the request once and assign a clear owner.",
      "2. Track status, due dates, completion evidence, and exception handling.",
      "3. Notify assignees and supervisors, then escalate overdue work to the department owner.",
      "4. Preserve an audit trail and require supervisor approval for high-risk or regulated work.",
      "5. Reuse Team Members, departments, business units, assets, and configured notification services.",
      "The requirements are ready for PRD generation.",
    ].join("\n");
    const coverage = Object.fromEntries(REQUIRED_COVERAGE_KEYS.map((key) => [key, true]));
    return {
      assistantMessage: newMessage("assistant", fallbackMessage),
      turn: {
        assistantMessage: fallbackMessage,
        facts,
        coverage,
        unresolvedQuestions: [],
        readyForSpecification: true,
      },
      facts,
      coverage,
      unresolvedQuestions: [],
      readyForSpecification: true,
      model: "adams-interview-yolo-fallback",
    };
  }
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
