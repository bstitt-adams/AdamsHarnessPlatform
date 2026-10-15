import { getDb, HttpError } from "@/lib/adams-harness/server-store";
import {
  COLLECTIONS,
  type SiteCalendarDoc,
  type SiteCalendarItemDoc,
} from "@/lib/schema";
import type {
  BrainConnector,
  SolutionSpecificationDoc,
} from "@/lib/adams-harness/types";
import { GENERATED_MODULES } from "@/modules/generated/registry";

export interface PlatformDocument {
  logicalKey: string;
  title: string;
  text: string;
}

async function approvedSpecifications(
  departmentId: string,
): Promise<PlatformDocument[]> {
  const snap = await getDb()
    .collection(COLLECTIONS.SOLUTION_SPECIFICATIONS)
    .where("departmentId", "==", departmentId)
    .where("status", "==", "approved")
    .limit(50)
    .get();
  const byInterview = new Map<string, SolutionSpecificationDoc>();
  for (const doc of snap.docs) {
    const spec = { id: doc.id, ...doc.data() } as SolutionSpecificationDoc;
    const current = byInterview.get(spec.interviewId);
    if (!current || spec.version > current.version) {
      byInterview.set(spec.interviewId, spec);
    }
  }
  return [...byInterview.values()].map((spec) => {
    const s = spec.sections;
    const lines = [
      `Title: ${spec.title}`,
      `Version: ${spec.version}`,
      `Summary: ${s.summary}`,
      `Current process: ${s.currentProcess}`,
      `Future process: ${s.futureProcess}`,
      `Roles: ${s.roles.map((r) => `${r.role} - ${r.responsibilities}`).join("; ")}`,
      `Notifications: ${s.notifications.map((n) => `${n.name} - ${n.description}`).join("; ")}`,
      `Integrations: ${s.integrations.map((i) => `${i.name} - ${i.description}`).join("; ")}`,
      `Acceptance criteria: ${s.acceptanceCriteria.join("; ")}`,
    ];
    return {
      logicalKey: `specification/${spec.interviewId}`,
      title: `Approved specification: ${spec.title} (v${spec.version})`,
      text: lines.join("\n"),
    };
  });
}

async function siteCalendars(): Promise<PlatformDocument[]> {
  const db = getDb();
  const calendars = await db.collection(COLLECTIONS.SITECALENDARS).limit(100).get();
  const documents: PlatformDocument[] = [];
  for (const doc of calendars.docs) {
    const cal = { id: doc.id, ...doc.data() } as SiteCalendarDoc;
    if (!cal.isActive) continue;
    const items = await db
      .collection(COLLECTIONS.SITECALENDARITEMS)
      .where("siteId", "==", cal.id)
      .orderBy("date", "asc")
      .limit(500)
      .get();
    const lines = [
      `Company safety calendar: ${cal.name}`,
      ...items.docs.map((itemDoc) => {
        const item = itemDoc.data() as SiteCalendarItemDoc;
        const parts = [
          `Title: ${item.title}`,
          item.titleEs ? `Title (ES): ${item.titleEs}` : "",
          item.description ? `Description: ${item.description}` : "",
          item.descriptionEs ? `Description (ES): ${item.descriptionEs}` : "",
          `Date: ${item.date?.toDate?.().toISOString().slice(0, 10) ?? ""}`,
          item.time ? `Time: ${item.time}` : "",
          item.location ? `Location: ${item.location}` : "",
        ];
        return parts.filter(Boolean).join(" | ");
      }),
    ];
    documents.push({
      logicalKey: `site-calendar/${cal.id}`,
      title: `Company safety calendar: ${cal.name}`,
      text: lines.join("\n"),
    });
  }
  return documents;
}

function moduleDefinitions(departmentId: string): PlatformDocument[] {
  return GENERATED_MODULES.filter((m) => m.departmentId === departmentId).map(
    (m) => {
      const lines = [
        `Module: ${m.name}`,
        `Description: ${m.description}`,
        "Record types:",
        ...m.recordTypes.map(
          (r) =>
            `- ${r.label} (${r.id}): ${r.fields.map((f) => `${f.label} [${f.type}${f.required ? ", required" : ""}]`).join("; ")}`,
        ),
        "Forms:",
        ...m.forms.map(
          (f) => `- ${f.title} (${f.id}) on ${f.recordTypeId}: ${f.description}`,
        ),
        "Workflows:",
        ...m.workflows.map(
          (w) => `- ${w.label} (${w.id}): trigger ${w.trigger} on ${w.recordTypeId}`,
        ),
      ];
      return {
        logicalKey: `module/${m.slug}`,
        title: `Module definition: ${m.name}`,
        text: lines.join("\n"),
      };
    },
  );
}

export async function collectPlatformDocuments(
  connector: BrainConnector,
  departmentId: string,
): Promise<PlatformDocument[]> {
  switch (connector) {
    case "approved_specifications":
      return approvedSpecifications(departmentId);
    case "site_calendars":
      return siteCalendars();
    case "module_definitions":
      return moduleDefinitions(departmentId);
    default:
      throw new HttpError(400, "Unknown connector");
  }
}
