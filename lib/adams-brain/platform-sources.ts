import { getDb, HttpError } from "@/lib/adams-harness/server-store";
import {
  COLLECTIONS,
  type SiteCalendarDoc,
  type SiteCalendarItemDoc,
  type UserAssetDoc,
} from "@/lib/schema";
import type {
  BrainConnector,
  ModuleRecordDoc,
  SolutionSpecificationDoc,
} from "@/lib/adams-harness/types";
import { GENERATED_MODULES } from "@/modules/generated/registry";
import { listAllAvailableModules } from "@/lib/modules/dynamic-catalog";

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

async function moduleDefinitions(departmentId: string): Promise<PlatformDocument[]> {
  const dynamicList = await listAllAvailableModules();
  const all = [...GENERATED_MODULES, ...dynamicList];
  const seen = new Set<string>();
  const filtered = all.filter((m) => {
    if (seen.has(m.slug)) return false;
    seen.add(m.slug);
    return m.departmentId === departmentId || departmentId === "safety";
  });

  return filtered.map((m) => {
    const lines = [
      `Module: ${m.name} (slug: ${m.slug})`,
      `Department: ${m.departmentId}`,
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
  });
}

async function moduleRecords(departmentId: string): Promise<PlatformDocument[]> {
  const db = getDb();
  const snap = await db
    .collection(COLLECTIONS.MODULE_RECORDS)
    .where("departmentId", "==", departmentId)
    .limit(200)
    .get();

  const byModule = new Map<string, ModuleRecordDoc[]>();
  for (const docSnap of snap.docs) {
    const rec = { id: docSnap.id, ...docSnap.data() } as ModuleRecordDoc;
    const list = byModule.get(rec.moduleSlug) ?? [];
    list.push(rec);
    byModule.set(rec.moduleSlug, list);
  }

  const docs: PlatformDocument[] = [];
  for (const [slug, records] of byModule.entries()) {
    const lines = [
      `Solution Module Records for ${slug} (${records.length} items):`,
      ...records.map((r) => {
        const fields = Object.entries(r.data || {})
          .map(([k, v]) => `${k}: ${v}`)
          .join(", ");
        const ext = Object.entries(r.extendedData || {})
          .map(([k, v]) => `${k}: ${v}`)
          .join(", ");
        return `- [${r.status}] ID=${r.id} | ${fields}${ext ? ` | Extended: ${ext}` : ""}${r.notes ? ` | Notes: ${r.notes}` : ""}`;
      }),
    ];
    docs.push({
      logicalKey: `module-records/${slug}`,
      title: `Solution Records: ${slug}`,
      text: lines.join("\n"),
    });
  }
  return docs;
}

async function userAssets(): Promise<PlatformDocument[]> {
  const db = getDb();
  const snap = await db.collection(COLLECTIONS.USER_ASSETS).limit(300).get();
  if (snap.empty) return [];
  const lines = [
    "Adams Electric Assigned Assets Inventory:",
    ...snap.docs.map((d) => {
      const a = d.data() as UserAssetDoc;
      return `- ${a.assetType.toUpperCase()}: ${a.assetName} (ID/SN: ${a.identifier || "N/A"}) assigned to ${a.assignedToName} (${a.assignedToEmail}) [Status: ${a.status}] ${a.notes || ""}`;
    }),
  ];
  return [
    {
      logicalKey: "company-assets/inventory",
      title: "Adams Electric Assigned Assets Directory",
      text: lines.join("\n"),
    },
  ];
}

async function systemDocs(): Promise<PlatformDocument[]> {
  const lines = [
    "Adams Platform System Architecture & Active Modules Reference:",
    "- My Mission Critical: My Tasks (/portal/my-tasks), My Assets (/portal/my-assets), My Training and Certs (/portal/my-training), My Orders (/portal/my-orders), My Ideas (/portal/my-ideas).",
    "- Adams Electric Core: Bug Tracker (/portal/bug-tracker), System Documentation (/portal/system-docs), Command Control (/portal/opportunities), Projects (/portal/projects), Adams Master Calendar (/portal/calendar), Proposal Creator (/portal/proposals), Team Members (/portal/admin/team-members), Documents (/portal/documents), Academy (/academy).",
    "- Mission Critical Operations: Safety Calendar (/safety-calendar), Adams Learning Academy (/academy), Certification Tracker (/portal/admin/academy/certificates), Vehicle Inspection (/portal/vehicle-inspection), Safety Request Box (/portal/safety-request-box), Order Tracking (/portal/order-tracking), MindChuk Clone (/portal/mindchuk-clone).",
    "- AI & Solution Harness: Solutions (/portal/solutions), Solution App Workspaces (/portal/modules), Module Alerts (/portal/module-notifications), AdamsBrain / GBrain (/portal/adams-brain), AI Workforce (/portal/ai-workforce).",
  ];
  return [
    {
      logicalKey: "system-docs/overview",
      title: "Adams Platform Modules & System Reference",
      text: lines.join("\n"),
    },
  ];
}

async function userTrainingCerts(): Promise<PlatformDocument[]> {
  const db = getDb();
  const snap = await db.collection(COLLECTIONS.USER_TRAINING_CERTS).limit(300).get();
  if (snap.empty) return [];
  const lines = [
    "Adams Electric Workforce Training & Certifications Registry:",
    ...snap.docs.map((d) => {
      const c = d.data();
      return `- ${c.trainingTitle} (${c.trainingCategory}) | Team Member: ${c.userName} (${c.userEmail}) | Issued by: ${c.issuingOrganization} | Completed: ${c.completionDate || "N/A"} | Expires: ${c.expirationDate || "N/A"} | ID: ${c.credentialId || "N/A"} ${c.notes ? `| Notes: ${c.notes}` : ""}`;
    }),
  ];
  return [
    {
      logicalKey: "company-training/certifications",
      title: "Adams Electric Training & Certifications Registry",
      text: lines.join("\n"),
    },
  ];
}

async function commandControlAndProjects(): Promise<PlatformDocument[]> {
  const db = getDb();
  const [oppsSnap, projectsSnap] = await Promise.all([
    db.collection(COLLECTIONS.OPPORTUNITIES).limit(200).get(),
    db.collection(COLLECTIONS.PROJECTS).limit(200).get(),
  ]);
  const docs: PlatformDocument[] = [];
  if (!oppsSnap.empty) {
    const lines = [
      "Adams Electric Command Control Opportunities:",
      ...oppsSnap.docs.map((d) => {
        const o = d.data();
        return `- Opportunity: ${o.name} | Stage: ${o.stage} | Value: $${Number(o.value || 0).toLocaleString()} | Probability: ${o.probability ?? 0}% | Notes: ${o.description || o.notes || ""}`;
      }),
    ];
    docs.push({
      logicalKey: "command-control/opportunities",
      title: "Command Control Opportunities Pipeline",
      text: lines.join("\n"),
    });
  }
  if (!projectsSnap.empty) {
    const lines = [
      "Adams Electric Active Construction & Internal Projects:",
      ...projectsSnap.docs.map((d) => {
        const p = d.data();
        return `- Project: ${p.name} | Status: ${p.status} | Progress: ${p.progress ?? 0}% | Description: ${p.description || ""}`;
      }),
    ];
    docs.push({
      logicalKey: "command-control/projects",
      title: "Adams Electric Projects Directory",
      text: lines.join("\n"),
    });
  }
  return docs;
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
    case "module_records":
      return moduleRecords(departmentId);
    case "user_assets":
      return userAssets();
    case "user_training_certs":
      return userTrainingCerts();
    case "command_control_projects":
      return commandControlAndProjects();
    case "system_docs":
      return systemDocs();
    default:
      throw new HttpError(400, "Unknown connector");
  }
}
