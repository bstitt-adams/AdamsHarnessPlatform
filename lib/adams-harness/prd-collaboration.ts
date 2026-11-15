import { z } from "zod";
import { requestHermesStructured } from "@/lib/hermes/client";
import { listAllAvailableModules } from "@/lib/modules/dynamic-catalog";
import type { InterviewPrdDoc, PrdChatMessage, PrdSystemDiagram } from "./types";

const MAX_HISTORY = 20;

/** Core platform capabilities every generated module can lean on. */
const PLATFORM_SERVICES = [
  "Team Members (canonical workforce identity, teamMemberId)",
  "Departments & Business Units",
  "Asset Manager (userAssets, Jamf/NinjaOne sync)",
  "Adams Academy LMS & Certification Tracker",
  "Hardhat QR identity",
  "Safety Request Box & Vehicle Inspection",
  "Notifications (email, Microsoft Teams, Telegram via Hermes)",
  "Firebase Auth & role-based feature visibility",
  "Firestore data store & Firebase Storage",
];

async function platformContext(): Promise<string> {
  const modules = await listAllAvailableModules().catch(() => []);
  const moduleLines = modules
    .slice(0, 40)
    .map((m) => `- ${m.name} (${m.slug})${m.description ? `: ${m.description.slice(0, 140)}` : ""}`);
  return [
    "Shared platform services:",
    ...PLATFORM_SERVICES.map((s) => `- ${s}`),
    "",
    "Existing platform modules:",
    ...(moduleLines.length ? moduleLines : ["- (none registered)"]),
  ].join("\n");
}

const chatResultSchema = z.object({
  reply: z.string().min(1),
  revisedContent: z.string().nullable(),
  changeSummary: z.array(z.string()),
});

const CHAT_SYSTEM_PROMPT = `You are a senior product manager collaborating with an Adams Electric admin to refine a Product Requirements Document (PRD) for a module on the Adams Platform.
Rules:
- Answer the admin's message directly in "reply" (concise, plain language). Ask a pointed clarifying question when requirements are ambiguous.
- When the admin asks for a change, or new requirements/clarity are provided, return the COMPLETE rewritten PRD Markdown in "revisedContent" (never a fragment or diff). Preserve existing headings and approved content unless asked to change it; make requirements specific, testable, and numbered.
- When no rewrite is warranted (pure question/discussion), set "revisedContent" to null.
- "changeSummary" lists each concrete change you made (empty when revisedContent is null).
- Prefer reusing shared platform data (teamMemberId, departments, assets) over creating duplicate records.
Respond only with JSON: {"reply": string, "revisedContent": string|null, "changeSummary": string[]}`;

export async function runPrdChatTurn(input: {
  prd: InterviewPrdDoc;
  currentContent: string;
  message: string;
}): Promise<{ reply: string; revisedContent: string | null; changeSummary: string[]; model: string }> {
  const history = (input.prd.aiChat || []).slice(-MAX_HISTORY).map((m) => ({
    role: m.role,
    content: m.role === "assistant" && m.changeSummary?.length
      ? `${m.content}\n(Changes proposed: ${m.changeSummary.join("; ")})`
      : m.content,
  }));
  const { data, model } = await requestHermesStructured({
    systemPrompt: CHAT_SYSTEM_PROMPT,
    temperature: 0.3,
    schema: chatResultSchema,
    messages: [
      {
        role: "user",
        content: [
          `PRD title: ${input.prd.title}`,
          "",
          await platformContext(),
          "",
          "Current PRD Markdown:",
          "```markdown",
          input.currentContent.slice(0, 40_000),
          "```",
        ].join("\n"),
      },
      { role: "assistant", content: "Understood. I have the current PRD and platform context. What would you like to refine?" },
      ...history,
      { role: "user", content: input.message },
    ],
  });
  return { ...data, model };
}

const diagramResultSchema = z.object({
  mermaid: z.string().min(10),
  features: z.array(z.object({ name: z.string(), functions: z.array(z.string()) })).min(1),
  integrationNotes: z.string(),
});

const DIAGRAM_SYSTEM_PROMPT = `You are a solutions architect for the Adams Platform. Produce a system diagram showing how the module described by the PRD fits within the platform.
Rules for "mermaid":
- Valid Mermaid "flowchart LR" syntax only, no Markdown fences, no HTML.
- A subgraph for the new module containing its key features as nodes.
- A subgraph "Adams Platform" containing only the shared services and existing modules this module actually reads from or writes to.
- External systems (if any) in their own subgraph.
- Labeled edges describing the data exchanged (e.g., -->|teamMemberId| ). Node ids must be alphanumeric/underscore; put human labels in brackets with double quotes, e.g. TM["Team Members"].
"features": each major feature of the module with the concrete functions it performs.
"integrationNotes": 2-4 sentences explaining the data sharing and dependencies.
Respond only with JSON: {"mermaid": string, "features": [{"name": string, "functions": string[]}], "integrationNotes": string}`;

export async function generatePrdSystemDiagram(input: {
  prd: InterviewPrdDoc;
  actorEmail?: string;
}): Promise<PrdSystemDiagram> {
  const { data } = await requestHermesStructured({
    systemPrompt: DIAGRAM_SYSTEM_PROMPT,
    temperature: 0.2,
    schema: diagramResultSchema,
    messages: [
      {
        role: "user",
        content: [
          `Module PRD title: ${input.prd.title}`,
          `Request kind: ${input.prd.requestKind}${input.prd.targetApp?.name ? ` (target: ${input.prd.targetApp.name})` : ""}`,
          input.prd.dataSharingOpportunities.length
            ? `Known data-sharing opportunities: ${input.prd.dataSharingOpportunities
                .map((d) => `${d.appName} [${d.direction}]: ${d.dataEntities.join(", ")}`)
                .join("; ")}`
            : "",
          "",
          await platformContext(),
          "",
          "PRD Markdown:",
          input.prd.content.slice(0, 30_000),
        ].filter(Boolean).join("\n"),
      },
    ],
  });
  return {
    mermaid: data.mermaid.replace(/^```(?:mermaid)?\s*/i, "").replace(/```\s*$/, "").trim(),
    features: data.features,
    integrationNotes: data.integrationNotes,
    generatedAt: new Date().toISOString(),
    ...(input.actorEmail ? { generatedByEmail: input.actorEmail } : {}),
  };
}

export function chatMessage(partial: Omit<PrdChatMessage, "createdAt">): PrdChatMessage {
  return { ...partial, createdAt: new Date().toISOString() };
}
