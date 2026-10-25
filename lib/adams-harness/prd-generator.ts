import {
  interviewPrdAnalysisSchema,
  type AppRequestKind,
  type InterviewPrdAnalysis,
  type InterviewPrdDoc,
  type ProcessInterviewDoc,
  type SpecificationSections,
} from "./types";
import type { ModuleDefinition } from "@/lib/modules/contract";
import { requestHermesStructured } from "@/lib/hermes/client";

type ModuleContext = Pick<
  ModuleDefinition,
  "slug" | "name" | "description" | "departmentId" | "recordTypes" | "forms"
>;

const REQUEST_KIND_LABELS: Record<AppRequestKind, string> = {
  new_app: "New platform app",
  existing_app_enhancement: "Enhancement to an existing app",
  uncertain: "Needs review",
};

function compactModules(modules: ModuleContext[]): ModuleContext[] {
  return modules.slice(0, 60).map((module) => ({
    slug: module.slug,
    name: module.name,
    description: module.description,
    departmentId: module.departmentId,
    recordTypes: module.recordTypes.slice(0, 4).map((recordType) => ({
      id: recordType.id,
      label: recordType.label,
      fields: recordType.fields.slice(0, 20).map((field) => ({
        id: field.id,
        label: field.label,
        type: field.type,
        required: field.required,
        options: field.options,
        helpText: field.helpText,
        min: field.min,
        max: field.max,
        maxLength: field.maxLength,
      })),
    })),
    forms: module.forms.slice(0, 8),
  }));
}

function transcriptForPrompt(interview: ProcessInterviewDoc): string {
  return interview.messages
    .slice(-80)
    .map((message) => `${message.role === "assistant" ? "Interviewer" : "Respondent"}: ${message.content}`)
    .join("\n");
}

function tokenize(value: string): Set<string> {
  return new Set(
    value
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((token) => token.length > 2),
  );
}

function scoreModuleMatch(interviewText: string, module: ModuleContext): number {
  const interviewTokens = tokenize(interviewText);
  if (interviewTokens.size === 0) return 0;
  const moduleText = [
    module.slug,
    module.name,
    module.description,
    ...module.recordTypes.flatMap((recordType) => [
      recordType.label,
      ...recordType.fields.map((field) => field.label),
    ]),
    ...module.forms.map((form) => form.title),
  ].join(" ");
  const moduleTokens = tokenize(moduleText);
  let matches = 0;
  for (const token of interviewTokens) {
    if (moduleTokens.has(token)) matches += 1;
  }
  return matches / interviewTokens.size;
}

function chooseFallbackTarget(
  interview: ProcessInterviewDoc,
  modules: ModuleContext[],
): { module: ModuleContext | null; score: number } {
  const interviewText = [
    interview.title,
    interview.task,
    interview.facts.desiredProcess || "",
    interview.facts.systems.join(" "),
    interview.facts.integrations.join(" "),
  ].join(" ");
  let best: ModuleContext | null = null;
  let bestScore = 0;
  for (const module of modules) {
    const score = scoreModuleMatch(interviewText, module);
    if (score > bestScore) {
      best = module;
      bestScore = score;
    }
  }
  return { module: best, score: bestScore };
}

function fallbackSpecificationSections(
  interview: ProcessInterviewDoc,
): SpecificationSections {
  const facts = interview.facts;
  return {
    summary:
      facts.desiredProcess ||
      facts.task ||
      interview.task ||
      `Implement ${interview.title} as an Adams Platform solution.`,
    currentProcess:
      facts.currentSteps.length > 0
        ? `Trigger: ${facts.trigger || "manual/event"}. Steps: ${facts.currentSteps.join(" -> ")}`
        : `Current systems: ${facts.systems.join(", ") || "manual workflow"}.`,
    futureProcess:
      facts.desiredProcess ||
      `Create a guided ${interview.title} workspace with assignments, statuses, evidence, reminders, and reporting.`,
    painPoints: facts.painPoints,
    roles: facts.actors.map((role) => ({
      role,
      responsibilities: `Participates in the ${interview.title} workflow and maintains assigned records.`,
    })),
    dataEntities: [
      { name: "Title", description: "Primary name or summary for the item." },
      { name: "Status", description: "Active, completed, or archived lifecycle state." },
      { name: "Owner", description: "Responsible Team Member or respondent-provided owner." },
      { name: "Due Date", description: "Expected completion or follow-up date." },
      { name: "Evidence", description: "Completion artifacts described during the interview." },
    ],
    forms: [
      {
        name: `${interview.title} Intake`,
        description: `Creates and assigns a new ${interview.title} item.`,
      },
    ],
    notifications: facts.notifications.map((name, index) => ({
      name: `Notification ${index + 1}`,
      description: name,
    })),
    integrations: facts.integrations.map((name) => ({
      name,
      description: "Integration or shared-data opportunity identified during the interview.",
    })),
    approvals: facts.humanApprovals.map((approval, index) => ({
      step: `Approval ${index + 1}`,
      approver: "Department owner or designated supervisor",
      condition: approval,
    })),
    permissions:
      "Admin and department-scoped access by default; expose only operational fields needed by each role.",
    auditRequirements: [
      ...facts.compliance,
      "Record creator, respondent, status changes, approvals, deployment, and record mutations.",
    ],
    acceptanceCriteria: [
      "Authorized users can create, search, update, complete, and report on records.",
      "Owners and supervisors receive required notifications and escalation reminders.",
      "The workspace exposes the operational metrics described in the PRD.",
      "Approved PRD remains traceable to the source interview and deployment build.",
    ],
    risks: [
      ...facts.exceptions,
      "Validate migrated or shared data ownership before enabling cross-app writes.",
    ],
    outOfScope: ["Changes not represented in the accepted PRD or approved specification."],
  };
}

function buildFallbackAnalysis(
  interview: ProcessInterviewDoc,
  modules: ModuleContext[],
  adminContext?: string,
): InterviewPrdAnalysis {
  const { module, score } = chooseFallbackTarget(interview, modules);
  const requestKind: AppRequestKind =
    module && score >= 0.22
      ? "existing_app_enhancement"
      : module && score >= 0.1
        ? "uncertain"
        : "new_app";
  const targetApp = module
    ? {
        slug: module.slug,
        name: module.name,
        reason:
          requestKind === "existing_app_enhancement"
            ? `Highest catalog similarity (${Math.round(score * 100)}%) based on request title, systems, desired process, and module fields.`
            : `Possible overlap (${Math.round(score * 100)}%) that should be reviewed before creating a new app.`,
        confidence: Math.min(0.95, Math.max(0.15, score * 2)),
      }
    : null;
  const sections = {
    overview:
      interview.facts.desiredProcess ||
      interview.task ||
      `Create a platform workspace for ${interview.title}.`,
    problemStatement:
      interview.facts.painPoints.join(" ") ||
      `The ${interview.title} process needs a centralized digital workflow.`,
    goals: [
      "Centralize intake, ownership, statuses, and completion evidence.",
      "Reduce manual tracking across spreadsheets, email, text messages, and paper forms.",
      "Expose operational metrics and escalation visibility.",
    ],
    userStories: [
      `As a ${interview.facts.actors[0] || "department user"}, I can create and update ${interview.title} records.`,
      "As a department owner, I can review workload, risks, overdue items, and approvals.",
      "As an administrator, I can trace the deployed workspace back to the accepted PRD and source interview.",
    ],
    functionalRequirements: [
      "Create a searchable record workspace with status, owner, due date, priority, notes, and evidence fields.",
      "Provide an intake form matching the process captured during the interview.",
      "Send assignment, reminder, overdue, completion, and approval notifications.",
      "Provide dashboards for total, active, completed, overdue, and category breakdowns.",
      "Preserve an audit trail for record changes, approvals, and deployment.",
    ],
    dataModel: [
      { name: "Record", description: "Primary process item with owner, status, due date, and evidence." },
      { name: "Assignment", description: "Team Member or role responsible for the next step." },
      { name: "Evidence", description: "File, note, signature, or field proving completion." },
    ],
    integrations: interview.facts.integrations.map((name) => ({
      name,
      description: "Potential integration identified in the interview.",
    })),
    permissionsSecurity:
      "Admin-managed access with department scoping and least-privilege record visibility.",
    analytics: [
      "Total items",
      "Active versus completed rate",
      "Overdue items",
      "Items by department, owner, status, and category",
    ],
    acceptanceCriteria: [
      "Admin can review the generated PRD, revise it, and stage it for deployment.",
      "Deployment creates a traceable approved specification and module build.",
      "End users can manage the workflow without duplicate manual tracking.",
    ],
    assumptions: [
      "Interview answers accurately describe the current and desired workflow.",
      "Required source systems and user roles can be mapped to platform records.",
    ],
    openQuestions: interview.unresolvedQuestions,
    rolloutPlan: [
      "Review and edit the AI-generated PRD.",
      "Stage the accepted PRD for deployment.",
      "Deploy the generated workspace and validate records, permissions, notifications, and dashboards.",
    ],
  };
  const specificationSections = fallbackSpecificationSections(interview);
  const dataSharingOpportunities = module
    ? [
        {
          appSlug: module.slug,
          appName: module.name,
          direction: "bidirectional" as const,
          dataEntities: module.recordTypes
            .flatMap((recordType) => recordType.fields.slice(0, 6).map((field) => field.label))
            .slice(0, 8),
          recommendation: `Evaluate shared fields and records with ${module.name} before creating duplicate data.`,
          benefit: "Prevents duplicate ownership, status, evidence, and reporting structures across platform apps.",
        },
      ]
    : [];
  const executiveSummary = `${REQUEST_KIND_LABELS[requestKind]}: ${interview.title}. ${sections.overview}`;
  return interviewPrdAnalysisSchema.parse({
    title: `${interview.title} Requirements`,
    executiveSummary,
    requestKind,
    targetApp,
    classificationReason: targetApp?.reason ||
      "No existing platform app had sufficient title, process, system, or field overlap to recommend an enhancement.",
    dataSharingOpportunities,
    integrationRecommendations: [
      ...interview.facts.integrations.map((name) => ({
        name,
        description: "Review this system as an integration source or destination.",
      })),
      ...dataSharingOpportunities.map((item) => ({
        name: item.appName,
        description: item.recommendation,
      })),
    ],
    prdMarkdown: [
      `# ${interview.title} Product Requirements`,
      "",
      "## Executive Summary",
      executiveSummary,
      "",
      "## Request Classification",
      `${REQUEST_KIND_LABELS[requestKind]}${targetApp ? ` — ${targetApp.name}` : ""}`,
      "",
      "## Problem",
      sections.problemStatement,
      "",
      "## Goals",
      ...sections.goals.map((item) => `- ${item}`),
      "",
      "## Functional Requirements",
      ...sections.functionalRequirements.map((item) => `- ${item}`),
      "",
      "## Data Sharing Opportunities",
      ...(dataSharingOpportunities.length
        ? dataSharingOpportunities.map(
            (item) => `- ${item.appName} (${item.direction}): ${item.recommendation}`,
          )
        : ["- No high-confidence app-sharing opportunity was identified."]),
      "",
      "## Acceptance Criteria",
      ...sections.acceptanceCriteria.map((item) => `- ${item}`),
      adminContext ? `\n## Admin Context\n${adminContext}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
    sections,
    specificationSections,
  });
}

const PRD_SYSTEM_PROMPT = `You are a senior enterprise product manager and platform architect. Analyze a completed requirements interview and the catalog of existing apps on the same platform. Produce an implementation-ready PRD.

Requirements:
- Ground every statement in the interview facts, transcript, attachments, admin corrections, and existing app catalog.
- Decide whether the request is a "new_app", "existing_app_enhancement", or "uncertain".
- For an enhancement, identify the most likely existing app slug/name and explain why.
- Recommend concrete data sharing opportunities with existing apps. Prefer shared ownership, departments, projects, customers, assets, certifications, calendar events, tasks, notifications, records, evidence, statuses, and dashboards. Never recommend duplicating authoritative data.
- Produce a polished PRD in Markdown in "prdMarkdown" plus structured sections.
- Also produce "specificationSections" compatible with the platform's solution-specification schema so it can be deployed.
- Preserve admin corrections as authoritative context; if prior PRD text conflicts with admin context, prefer the admin context.
- If the request is unsafe, unclear, or outside scope, put those concerns in openQuestions/risks rather than inventing requirements.

Return only one JSON object matching the requested schema.`;

export async function generateInterviewPrdAnalysis(input: {
  interview: ProcessInterviewDoc;
  modules: ModuleContext[];
  previousPrd?: InterviewPrdDoc | null;
  adminContext?: string;
}): Promise<{ analysis: InterviewPrdAnalysis; model: string }> {
  const { interview, modules, previousPrd, adminContext } = input;
  const moduleContext = compactModules(modules);
  const prompt = [
    `Interview title: ${interview.title}`,
    `Department/category id: ${interview.departmentId}`,
    `Respondent: ${interview.respondentName || interview.createdByName || "Not provided"}`,
    `Status: ${interview.status}`,
    `Seed task: ${interview.task || "none"}`,
    `Facts: ${JSON.stringify(interview.facts)}`,
    `Coverage: ${JSON.stringify(interview.coverage)}`,
    `Unresolved questions: ${interview.unresolvedQuestions.join(" | ") || "none"}`,
    `Attachment analyses: ${JSON.stringify((interview.attachments || []).map((a) => ({
      fileName: a.fileName,
      fileType: a.fileType,
      summary: a.summary,
      suggestedQuestions: a.suggestedQuestions,
    })))}`,
    `Admin context/corrections: ${adminContext || "none"}`,
    previousPrd
      ? `Previous PRD v${previousPrd.version} (retain correct details, revise unclear content): ${previousPrd.content.slice(0, 20_000)}`
      : "Previous PRD: none",
    `Existing app catalog: ${JSON.stringify(moduleContext)}`,
    "Transcript:",
    transcriptForPrompt(interview),
  ].join("\n\n");

  try {
    const { data, model } = await requestHermesStructured({
      systemPrompt: PRD_SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }],
      schema: interviewPrdAnalysisSchema,
      temperature: 0.2,
    });
    return { analysis: data, model };
  } catch {
    return {
      analysis: buildFallbackAnalysis(interview, modules, adminContext),
      model: "adams-prd-analyzer",
    };
  }
}
