/**
 * Exports Firestore to NDJSON files for Cosmos migration.
 * Output: scripts/migrate/data/<collection>.ndjson (one JSON doc per line).
 * Subcollections are exported as `<parent>__<sub>.ndjson` with `_parentId`.
 * Re-runnable; --since=<ms-epoch> exports only docs updated after that time
 * (requires an updatedAt field — skips collections lacking it).
 */
import { readFileSync, mkdirSync, createWriteStream, writeFileSync } from "node:fs";
import path from "node:path";

for (const l of readFileSync(".env.local", "utf8").split("\n")) {
  const m = l.match(/^\s*([A-Z_0-9]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const { adminDb } = await import("../../lib/firebase-admin");
const { COLLECTIONS } = await import("../../lib/schema");

const OUT = path.join("scripts", "migrate", "data");
mkdirSync(OUT, { recursive: true });
const sinceIdx = process.argv.indexOf("--since");
const since = sinceIdx > -1 ? Number(process.argv[sinceIdx + 1]) : 0;

const SUBCOLLECTIONS = [
  { parent: "projects", sub: "items" },
  { parent: "projects", sub: "files" },
  { parent: "projects", sub: "milestones" },
  { parent: "meetings", sub: "actionItems" },
  { parent: "rocks", sub: "milestones" },
];

// Firestore Timestamps/arrays/objects need a serializer that marks them
const ser = (v: unknown): unknown => {
  if (v == null || typeof v !== "object") return v;
  if (typeof (v as { toDate?: unknown }).toDate === "function")
    return { __ts: (v as { toDate: () => Date }).toDate().toISOString() };
  if (Array.isArray(v)) return v.map(ser);
  const o: Record<string, unknown> = {};
  for (const [k, x] of Object.entries(v as Record<string, unknown>)) o[k] = ser(x);
  return o;
};

const db = adminDb!;
const report: Record<string, number> = {};

async function dumpColl(name: string, ref: FirebaseFirestore.CollectionReference, file: string, parentId?: string, append?: boolean) {
  let q: FirebaseFirestore.Query = ref;
  if (since) q = q.where("updatedAt", ">", new Date(since));
  const snap = await q.get();
  const w = createWriteStream(file, { flags: append || since ? "a" : "w" });
  for (const d of snap.docs) {
    const doc = ser({ _id: d.id, ...(d.data() as object), ...(parentId ? { _parentId: parentId } : {}) });
    w.write(JSON.stringify(doc) + "\n");
  }
  await new Promise((r) => w.end(r));
  report[file] = (report[file] || 0) + snap.size;
  return snap.docs;
}

const topLevel = Object.values(COLLECTIONS) as string[];
for (const name of topLevel) {
  const docs = await dumpColl(name, db.collection(name), path.join(OUT, `${name}.ndjson`));
  console.log(`${name}: ${docs.length}`);
}
for (const { parent, sub } of SUBCOLLECTIONS) {
  const file = path.join(OUT, `${parent}__${sub}.ndjson`);
  if (!since) writeFileSync(file, ""); // truncate once; each parent then appends
  const parents = await db.collection(parent).select().get();
  for (const p of parents.docs) {
    await dumpColl(`${parent}.${p.id}.${sub}`, p.ref.collection(sub) as FirebaseFirestore.CollectionReference, file, p.id, true);
  }
}
writeFileSync(path.join(OUT, "_report.json"), JSON.stringify({ since, at: new Date().toISOString(), report }, null, 2));
console.log("DONE", JSON.stringify(report).slice(0, 200));
process.exit(0);
