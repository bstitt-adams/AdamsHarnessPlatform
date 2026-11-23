/**
 * Seeds the planning tracker (docs/planning_files/Adams_Platform_Dataset_Tracker.xlsx)
 * into the Projects module: one project per workbook sheet, each row as an
 * item doc under projects/{id}/items. Re-running refreshes items in place.
 */
import { readFileSync } from "node:fs";
import JSZip from "jszip";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z_0-9]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const { adminDb } = await import("../lib/firebase-admin");
const { Timestamp } = await import("firebase-admin/firestore");

const XLSX = "docs/planning_files/Adams_Platform_Dataset_Tracker.xlsx";
const FIELD = (v: string) => v.trim();
const dec = (s: string) =>
  s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
   .replace(/&#8211;/g, "–").replace(/&#8594;/g, "→").replace(/&#10;/g, " ").replace(/<[^>]+>/g, "");
// Excel serial → ISO date string
const excelDate = (n: string) => {
  const d = new Date(Date.UTC(1899, 11, 30) + Number(n) * 86400000);
  return Number.isFinite(+d) && /^\d+$/.test(n) ? d.toISOString().slice(0, 10) : n;
};

async function sheetRows(zip: JSZip, sheetFile: string): Promise<string[][]> {
  // sheetFile like "sheet1"
  const entry = zip.files[`xl/worksheets/${sheetFile}.xml`];
  if (!entry) throw new Error(`sheet ${sheetFile} not found`);
  const xml = await entry.async("text");
  return [...xml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)].map((r) => {
    const out: string[] = [];
    for (const c of r[1].matchAll(/<c[^>]*r="([A-Z]+)\d+"[^>]*>([\s\S]*?)<\/c>/g)) {
      const col = c[1].charCodeAt(0) - 65;
      const t = c[2].match(/<t[^>]*>([\s\S]*?)<\/t>/);
      const v = c[2].match(/<v>([^<]*)<\/v>/);
      out[col] = t ? dec(t[1]).trim() : v ? v[1].trim() : "";
    }
    return out;
  });
}

const boardOf = (status: string) => {
  const s = status.toLowerCase();
  if (s.includes("block")) return "blocked";
  if (s.includes("progress")) return "in-progress";
  if (s.includes("done") || s.includes("complete")) return "done";
  return "todo";
};

interface ProjectDef { name: string; sheet: string; titleCol: number; desc: string; }
const PROJECTS: ProjectDef[] = [
  { name: "Platform Dataset Upkeep", sheet: "sheet1", titleCol: 1,
    desc: "13 datasets sent Oct–Nov 2026 for the Adams Platform (People, Training & Certifications, Jobsites, Order Tracking). Source: Adams_Platform_Dataset_Summary.md + Dataset_Tracker.xlsx. Track load status, upkeep owners, refresh cadence and next steps." },
  { name: "API & Integration Access", sheet: "sheet2", titleCol: 1,
    desc: "14 system access requests (Microsoft Graph, Azure hosting, Jamf, NinjaOne, Arcoro, CoreHR, etc.). Most are blocked on IT admin consent — owner: Clay Williams." },
  { name: "Missing Datasets", sheet: "sheet3", titleCol: 0,
    desc: "Data the platform still needs: vehicle expiry dates, JJ Keller completions, calendar events, agreed renewal rules." },
];

interface ItemSeed { title: string; status?: string; fields?: Record<string, string>; }
interface NamedProject { name: string; desc: string; source: string; items: ItemSeed[]; }

// Projects from the Dataset Summary's Section 5 processes + per-dataset actions
const MD_PROJECTS: NamedProject[] = [
  { name: "Certification Expiry & Renewal Engine", source: "dataset-summary",
    desc: "Section 5.1: 90/60/30/0-day expiry reminder ladder plus missing-cert tasks, replacing the manual OSHA tracker. Renewal periods must be agreed before due-date calc.",
    items: [
      { title: "Implement 90/60/30/0-day expiry reminders", status: "Not started", fields: { Owner: "Platform", "Needed for": "Cert tracker", Notes: "Escalates to named owner at each rung" } },
      { title: "Agree one renewal rule per certification", status: "Blocked", fields: { Owner: "Jeff Allen + Betty Jean Cardwell", Notes: "Dataset #7 conflicts with OSHA tracker (#6): OSHA 10, Competent Person differ; GC-stricter sites become per-site exceptions" } },
      { title: "Create tasks for missing certifications/documents", status: "Not started", fields: { Owner: "Platform", Notes: "SiteDocs Needs Certificate tab = seed list" } },
    ] },
  { name: "Onboarding Checklist Workflow", source: "dataset-summary",
    desc: "Section 5.2: convert the 38-column new-hire tracker (~207 hires) into a platform checklist where each column becomes a step with an owner and due date.",
    items: [
      { title: "Map 38 tracker columns to checklist steps", status: "Not started", fields: { Owner: "Platform + Betty Jean", Notes: "Four stages; OSHA card, GC orientation, IT/vehicle columns feed Training/Jobsite/Assets" } },
      { title: "OSHA card status field (Has/Needs/Ordered/Received)", status: "Not started", fields: { Notes: "Fixed status values per data-quality rules" } },
      { title: "GC orientation status field (Not sent/Sent/Complete/N/A)", status: "Not started" },
    ] },
  { name: "Site Assignment & Orientation", source: "dataset-summary",
    desc: "Section 5.3: assigning a person to a site auto-creates that site's required orientation tasks. Site master keyed on MC job number.",
    items: [
      { title: "Build site master list from MC job numbers", status: "Not started", fields: { Notes: "MC5005 AVC09, MC5010 CLT100, MC5015 CLT04, MC5020 CLT105, MC5050 QTS CLT1, MC5055 AVC044, MC5060 DLR CLT13, RA3500.1 AVC043; cost code 1-10-906" } },
      { title: "Site requirements records per site", status: "Not started", fields: { "Needed for": "Auto orientation tasks" } },
      { title: "Site-name normalization rule", status: "Not started", fields: { Notes: "Variants like 'CLT100**' and 'AVC-43' auto-convert or reject" } },
      { title: "Jobsite map view", status: "Not started", fields: { Owner: "Platform", Notes: "Jeff requested Nov 2; six site addresses known, CLT100/AVC44 missing" } },
    ] },
  { name: "JJ Keller Awareness Training Cycle", source: "dataset-summary",
    desc: "Section 5.4: Jeff sends a new awareness module ~every two weeks to a 22-person roster; completions tracked in platform.",
    items: [
      { title: "Scheduled JJ Keller export → platform import", status: "Blocked", fields: { Notes: "JJ Keller API cannot return completions/expiry; interim = scheduled report export", "Requested from": "JJ Keller / Jeff Allen" } },
      { title: "Biweekly module assignment + reminder workflow", status: "Not started", fields: { Notes: "First module: fire extinguisher awareness, sent Nov 2 to 22 staff" } },
    ] },
  { name: "Toolbox Talks & Safety Bulletins", source: "dataset-summary",
    desc: "Section 5.5: safety bulletins become scheduled toolbox talks on the Safety Calendar; rosters upload into cert records.",
    items: [
      { title: "Toolbox talk topics → Safety Calendar", status: "Not started", fields: { "Sent by": "Betty Jean Cardwell", Notes: "SB-2026-01 (UV flash burn) already scheduled for December in SiteDocs" } },
      { title: "Roster upload → training records", status: "Not started", fields: { Notes: "Brittany: safety team uploads talk rosters, they flow into cert tracker" } },
      { title: "English/Spanish talk blurbs", status: "Not started", fields: { Owner: "Betty Jean Cardwell" } },
    ] },
  { name: "Order Tracking (My Orders)", source: "dataset-summary",
    desc: "Section 5.6 + Kojo order log: every item on its own line with quantity, vendor, site, requester, cost, received date.",
    items: [
      { title: "Line-item order model", status: "Not started", fields: { Notes: "Betty Jean: item, qty, date, destination site, vendor + cost/received; prior spreadsheet too tedious" } },
      { title: "Seed from Kojo order log (2 Nefco orders)", status: "Not started", fields: { Notes: "PPE + site supplies for CLT100 and AVC09, sent Oct 15" } },
    ] },
  { name: "People Data Merge & Cleanup", source: "dataset-summary",
    desc: "Per-dataset actions: merge the two MC employee lists, enforce data-quality rules, dedupe on EE CODE.",
    items: [
      { title: "Merge MC Employees (BJ) into HR export list", status: "Not started", fields: { Notes: "Keep extra fields (site assignment, safety notes), then retire BJ list; swap personal emails for Adams emails" } },
      { title: "Company + current-site fields on person record", status: "Not started", fields: { Notes: "Hamlet roster has TechSource workers not on HR list — contractors need profiles/certs too" } },
      { title: "Dedupe on EE CODE + name/DOB review queue", status: "Not started", fields: { Notes: "Possible matches go to review, never silent merge" } },
      { title: "UTF-8 import + date validation rules", status: "Not started", fields: { Notes: "Excel serial→date; flag future/pre-1990 hire dates; '2025' hire-date bug" } },
    ] },
  { name: "Weekly Data Review Rhythm", source: "dataset-summary",
    desc: "Section 5.7: weekly review of data upkeep — refresh cadences, owners, blocked items.",
    items: [
      { title: "Weekly upkeep review meeting/report", status: "Not started", fields: { Owner: "Brittany Martin + platform", Notes: "Every dataset has owner + refresh cadence" } },
    ] },
];

// Projects identified in the Nov 20 PT Safety Specialist Dashboard transcript
const TRANSCRIPT_PROJECTS: NamedProject[] = [
  { name: "Safety Request Inbox", source: "pt-transcript",
    desc: "Brittany requested a single inbox where field staff (Doslyn, Luis, Robbie) send safety needs instead of emails/texts that get lost.",
    items: [
      { title: "Safety request submission + inbox view", status: "In progress", fields: { "Requested by": "Brittany Martin", Notes: "Built per transcript demo; needs field rollout" } },
      { title: "Roll out to safety team", status: "Not started", fields: { Notes: "Initial rollout = Brittany's 22-person team only" } },
    ] },
  { name: "Vehicle Inspections & Fleet Tracking", source: "pt-transcript",
    desc: "Six-month vehicle inspection cadence: photo VIN/plate/damage at issue, re-prompt at 6 months, photo analysis flags damage.",
    items: [
      { title: "Vehicle issue-day photo capture (VIN, plate, condition)", status: "Not started", fields: { Notes: "Jonathan Wallace getting a company vehicle — first candidate" } },
      { title: "6-month re-inspection prompts + photo comparison", status: "Not started", fields: { Notes: "Analyzes pictures: broken windshield → how to get fixed" } },
      { title: "Vehicle expiry data", status: "Blocked", fields: { "Requested from": "Fleet/insurance contact", Notes: "Also on Missing Datasets project" } },
    ] },
  { name: "Hard Hat QR Badges", source: "pt-transcript",
    desc: "QR code on hard hat → scan shows cert status + emergency contact. QTS-style cert verification in the field.",
    items: [
      { title: "QR badge generation + scan page", status: "In progress", fields: { Notes: "Demo'd; shows certs, photo placeholder, EN/ES" } },
      { title: "Emergency contact on badge", status: "Not started", fields: { "Requested by": "Brittany Martin", Notes: "Foreman scans badge → gets emergency contact (weekend/off-hours incident)" } },
      { title: "Fix blurry logo on badge", status: "Not started", fields: { Notes: "'cute, little, very bad, blurry Adams logo'" } },
      { title: "Confirm cert fields Jeff wants displayed", status: "Not started", fields: { Owner: "Jeff Allen" } },
    ] },
  { name: "Mass Texting & Emergency Alerts", source: "pt-transcript",
    desc: "AlertMedia replacement inside the platform: text/alert all employees or groups (gun-incident example showed no way to reach everyone).",
    items: [
      { title: "Evaluate in-platform texting vs AlertMedia", status: "Suggested", fields: { "Requested by": "Brittany Martin", Notes: "Currently pays for AlertMedia mostly for group texts (open enrollment reminders)" } },
      { title: "Emergency broadcast capability", status: "Not started", fields: { Notes: "Immediate reach to all/groups at a site" } },
    ] },
  { name: "Microsoft Graph: Email & Calendar", source: "pt-transcript",
    desc: "Jeff's email + calendar in the platform; admin consent keeps reverting. Leigh + Nick (Azure contact) may unblock it.",
    items: [
      { title: "Fix Azure AD admin consent for Graph scopes", status: "Blocked", fields: { Owner: "Clay Williams / Nick / Leigh Pfeiffer", Notes: "'It just keeps reverting back'; Nick in Louisiana until next week" } },
      { title: "Jeff's email + calendar sync", status: "Not started", fields: { "Needed for": "Morning brief, task distillation" } },
    ] },
  { name: "Morning Brief → Task Distillation", source: "pt-transcript",
    desc: "Distill email + texts into tasks with gated approvals; delegation to Betty Jean (Bojangles biscuits example).",
    items: [
      { title: "Email/text → task extraction", status: "Suggested", fields: { Notes: "Replaces Claude-generated morning brief; depends on Graph access" } },
      { title: "Gated approval workflow for auto-created tasks", status: "Not started" },
    ] },
  { name: "Chat Data Access: Teams & Security Scoping", source: "pt-transcript",
    desc: "Telegram read phase done, write phase live. Leigh + Brittany want tight scoping or a move to Teams — data outside Azure is the concern.",
    items: [
      { title: "Define data allowed over external chat", status: "In progress", fields: { Owner: "Leigh Pfeiffer + Brittany Martin", Notes: "Names/titles OK; detailed individual info NOT OK over Telegram" } },
      { title: "Microsoft Teams integration", status: "Suggested", fields: { Notes: "'Very easy to pivot from Telegram to Teams' — keeps data in Microsoft estate" } },
    ] },
  { name: "Adams Azure Migration & Ownership", source: "pt-transcript",
    desc: "Lift-and-shift the Docker container + data into Adams' Azure tenant; Adams owns source code.",
    items: [
      { title: "Migrate container + data to Adams tenant", status: "Not started", fields: { Notes: "Currently on Brian's Azure (~$300/mo, target $200); lift-and-shift ready" } },
      { title: "Transfer source code to Adams GitHub/Azure DevOps", status: "Not started" },
      { title: "Leigh architecture/security review", status: "Not started", fields: { Owner: "Leigh Pfeiffer", Notes: "Data locations, secrets storage, real permission checks vs UI hiding, AI model choice (Claude API today)" } },
    ] },
  { name: "Benefits Administration Rebuild", source: "pt-transcript",
    desc: "Brittany: current ben-admin system is hated; 'a ben admin system is so freaking simple' — wants it self-contained in the platform.",
    items: [
      { title: "Requirements interview for ben-admin", status: "Suggested", fields: { "Requested by": "Brittany Martin", Notes: "Run through AI interview tool per new-module process" } },
    ] },
  { name: "SiteDocs Replacement Evaluation", source: "pt-transcript",
    desc: "Long-term: 'we can rewrite SiteDocs' — continuous-integration path to reduce third-party reliance.",
    items: [
      { title: "Gap analysis: SiteDocs features vs platform", status: "Suggested", fields: { Notes: "Cert export + job-title format already known; orientation requirements captured" } },
    ] },
];

const zip = await JSZip.loadAsync(readFileSync(XLSX));
const db = adminDb!;

// Create-or-refresh a named project + its items
async function upsertProject(p: { name: string; desc: string; source: string }, items: ItemSeed[], fieldsFromSheet?: { headers: string[]; rows: string[][] }) {
  const existing = await db.collection("projects").where("planningImport", "==", true).where("name", "==", p.name).limit(1).get();
  let projectId: string;
  if (!existing.empty) {
    projectId = existing.docs[0].id;
    const snap = await db.collection("projects").doc(projectId).collection("items").get();
    const b = db.batch(); snap.docs.forEach((d) => b.delete(d.ref)); await b.commit();
  } else {
    const ref = db.collection("projects").doc();
    await ref.set({
      id: ref.id, name: p.name, description: p.desc,
      organizationName: "Adams Electric — Mission Critical Safety",
      status: "active", progress: 0, startDate: Timestamp.now(), endDate: null,
      teamIds: [], milestones: [], milestonesCompleted: 0, milestonesTotal: 0,
      planningImport: true, createdAt: Timestamp.now(), updatedAt: Timestamp.now(),
    });
    projectId = ref.id;
  }
  const batch = db.batch();
  items.forEach((it, i) => {
    const ref = db.collection("projects").doc(projectId).collection("items").doc();
    batch.set(ref, {
      id: ref.id, projectId, title: it.title,
      sourceStatus: it.status || "Not started", boardStatus: boardOf(it.status || "Not started"),
      fields: it.fields || {}, sortOrder: i, source: p.source, createdAt: Timestamp.now(),
    });
  });
  await batch.commit();
  console.log(`OK ${p.name} → ${projectId} (${items.length} items)`);
  return projectId;
}

// Sheet-derived projects (keep the raw columns as item fields)
for (const p of PROJECTS) {
  const rows = await sheetRows(zip, p.sheet);
  const headers = rows[0].map((h) => h || "col");
  const data = rows.slice(1).filter((r) => r.some((c) => c));
  const statusCol = headers.findIndex((h) => /^status$/i.test(h));
  const items: ItemSeed[] = data.map((r) => {
    const fields: Record<string, string> = {};
    headers.forEach((h, ci) => { if (h !== "#" && r[ci] !== undefined) fields[h] = ci === 7 ? excelDate(FIELD(r[ci])) : FIELD(r[ci]); });
    return { title: FIELD(r[p.titleCol] || "Row"), status: FIELD(r[statusCol] || ""), fields };
  });
  await upsertProject({ name: p.name, desc: p.desc, source: "dataset-tracker" }, items);
}

for (const p of MD_PROJECTS) await upsertProject(p, p.items);
for (const p of TRANSCRIPT_PROJECTS) await upsertProject(p, p.items);
process.exit(0);
