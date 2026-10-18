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

function buildFallbackSpecificationSections(
  interview: ProcessInterviewDoc,
): SpecificationSections {
  const f = interview.facts;
  const excelEntities = (interview.attachments || [])
    .flatMap((att) => att.sheets || [])
    .flatMap((sheet) =>
      sheet.columns.slice(0, 12).map((col) => ({
        name: col,
        description: `Imported column from Excel sheet "${sheet.name}".`,
      })),
    );

  return {
    summary:
      f.desiredProcess ||
      f.task ||
      interview.task ||
      `Standardized Adams Platform solution for ${interview.title} in department ${interview.departmentId}.`,
    currentProcess:
      f.currentSteps.length > 0
        ? `Trigger: ${f.trigger || "Manual / Event"}. Steps: ${f.currentSteps.join(" -> ")}`
        : `Currently managed via ${f.systems.join(", ") || "manual communication"}.`,
    futureProcess:
      f.desiredProcess ||
      `Digital workflow in Adams Platform with structured intake, owner assignment, ${f.timingEscalation || "due-date tracking"}, and automated notifications.`,
    painPoints: f.painPoints.length > 0 ? f.painPoints : ["Manual tracking and delayed visibility"],
    roles:
      f.actors.length > 0
        ? f.actors.map((actor) => ({
            role: actor,
            responsibilities: `Participates in ${interview.title} workflow and updates status.`,
          }))
        : [
            {
              role: "Department Owner",
              responsibilities: "Reviews, approves, and oversees workflow execution.",
            },
          ],
    dataEntities: [
      {
        name: "Title",
        description: "Primary identifier and summary of the item.",
      },
      {
        name: "Status & Priority",
        description: "Lifecycle state and urgency level.",
      },
      ...excelEntities,
      ...(f.completionEvidence.map((ev) => ({
        name: ev,
        description: "Required completion evidence.",
      })) || []),
    ],
    forms: [
      {
        name: `${interview.title} Intake Form`,
        description: `Captures new ${interview.title} items and assigns ownership.`,
      },
    ],
    notifications:
      f.notifications.length > 0
        ? f.notifications.map((n, idx) => ({
            name: `Notification ${idx + 1}`,
            description: n,
          }))
        : [
            {
              name: "Owner Assignment & Overdue Alert",
              description: "Notifies assigned owner on creation and escalates when overdue.",
            },
          ],
    integrations:
      f.integrations.map((i) => ({
        name: i,
        description: "Connected platform or external system integration.",
      })),
    approvals:
      f.humanApprovals.length > 0
        ? f.humanApprovals.map((a, idx) => ({
            step: `Approval Step ${idx + 1}`,
            approver: "Department Owner / Supervisor",
            condition: a,
          }))
        : [
            {
              step: "Completion Sign-Off",
              approver: "Department Supervisor",
              condition: "When required completion evidence is attached",
            },
          ],
    permissions: `Scoped to ${interview.departmentId} department members, department owners, and Adams Platform admins.`,
    auditRequirements:
      f.compliance.length > 0
        ? f.compliance
        : ["Full timestamped audit log of creation, status changes, and approvals"],
    acceptanceCriteria: [
      "Metrics dashboard displays live counts, completion rate, and AI recommended charts",
      "Global search and per-column filters work across all items",
      "Each item has a dedicated detail page storing extended attributes, notes, and comments",
      "App settings allow configuring visible columns, triggers, and external REST API keys",
    ],
    risks:
      f.exceptions.length > 0
        ? f.exceptions
        : ["Ensure field crews have mobile/portal access for timely updates"],
    outOfScope: ["Legacy external spreadsheets retired by this workflow"],
  };
}

export async function generateSpecificationSections(
  interview: ProcessInterviewDoc,
): Promise<{ sections: SpecificationSections; model: string }> {
  const covered = REQUIRED_COVERAGE_KEYS.filter((k) => interview.coverage[k]);
  const factsJson = JSON.stringify(interview.facts);

  try {
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
  } catch {
    return {
      sections: buildFallbackSpecificationSections(interview),
      model: "adams-specification-compiler",
    };
  }
}
