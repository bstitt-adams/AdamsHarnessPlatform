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

const zip = await JSZip.loadAsync(readFileSync(XLSX));
const db = adminDb!;

for (const p of PROJECTS) {
  const rows = await sheetRows(zip, p.sheet);
  const headers = rows[0].map((h) => h || "col");
  const data = rows.slice(1).filter((r) => r.some((c) => c));

  // Reuse existing project (matched by planningImport marker + name) or create.
  const existing = await db.collection("projects").where("planningImport", "==", true).where("name", "==", p.name).limit(1).get();
  let projectId: string;
  if (!existing.empty) {
    projectId = existing.docs[0].id;
    // clear previous items
    const items = await db.collection("projects").doc(projectId).collection("items").get();
    const batch = db.batch();
    items.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  } else {
    const ref = db.collection("projects").doc();
    await ref.set({
      id: ref.id, name: p.name, description: p.desc,
      organizationName: "Adams Electric — Mission Critical Safety",
      status: "active", progress: 0,
      startDate: Timestamp.fromDate(new Date("2026-11-22")), endDate: null,
      teamIds: [], milestones: [], milestonesCompleted: 0, milestonesTotal: 0,
      planningImport: true, createdAt: Timestamp.now(), updatedAt: Timestamp.now(),
    });
    projectId = ref.id;
  }

  const statusCol = headers.findIndex((h) => /^status$/i.test(h));
  const batch = db.batch();
  data.forEach((r, i) => {
    const fields: Record<string, string> = {};
    headers.forEach((h, ci) => { if (h !== "#" && r[ci] !== undefined) fields[h] = ci === 7 ? excelDate(FIELD(r[ci])) : FIELD(r[ci]); });
    const ref = db.collection("projects").doc(projectId).collection("items").doc();
    batch.set(ref, {
      id: ref.id, projectId, title: FIELD(r[p.titleCol] || `Row ${i + 1}`),
      sourceStatus: FIELD(r[statusCol] || ""), boardStatus: boardOf(FIELD(r[statusCol] || "")),
      fields, sortOrder: i, source: "dataset-tracker", createdAt: Timestamp.now(),
    });
  });
  await batch.commit();
  console.log(`OK ${p.name} → ${projectId} (${data.length} items)`);
}
process.exit(0);
