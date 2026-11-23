/**
 * Shadow verification: compares Firestore docs to Cosmos docs field-by-field.
 * Usage: npx tsx scripts/migrate/shadow-verify.mts [collection ...]
 * Defaults to a representative set. Timestamps↔Dates normalize to ISO before diff.
 */
import { readFileSync } from "node:fs";

for (const l of readFileSync(".env.local", "utf8").split("\n")) {
  const m = l.match(/^\s*([A-Z_0-9]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const { MongoClient } = await import("mongodb");
const { adminDb } = await import("../../lib/firebase-admin");
const norm = (v: unknown): unknown => {
  if (v == null || typeof v !== "object") return v;
  if (v instanceof Date) return v.toISOString();
  if (typeof (v as { toDate?: unknown }).toDate === "function")
    return (v as { toDate: () => Date }).toDate().toISOString();
  if (Array.isArray(v)) return v.map(norm);
  const o: Record<string, unknown> = {};
  for (const [k, x] of Object.entries(v as Record<string, unknown>)) o[k] = norm(x);
  return o;
};

const collections = process.argv.slice(2).filter((a) => !a.startsWith("-"));
const targets = collections.length ? collections : ["projects", "teamMembers", "userTrainingCerts"];
const client = new MongoClient(process.env.COSMOS_CONNECTION_STRING!, { appName: "adams-shadow" });
await client.connect();
const cosmos = client.db(process.env.COSMOS_DB_NAME || "adams");

let fail = 0;
for (const name of targets) {
  const fsDocs = new Map<string, unknown>();
  const snap = await adminDb!.collection(name).get();
  for (const d of snap.docs) fsDocs.set(d.id, norm({ id: d.id, ...d.data() }));
  const cxDocs = new Map<string, unknown>();
  for (const d of await cosmos.collection(name).find({}).toArray()) {
    const { _id, ...rest } = d as Record<string, unknown> & { _id: unknown };
    cxDocs.set(String(_id), norm({ id: String(_id), ...rest }));
  }
  const missing = [...fsDocs.keys()].filter((k) => !cxDocs.has(k));
  const extra = [...cxDocs.keys()].filter((k) => !fsDocs.has(k));
  const diffs: string[] = [];
  for (const [k, f] of fsDocs) {
    const c = cxDocs.get(k);
    if (!c) continue;
    if (JSON.stringify(f) !== JSON.stringify(c)) {
      const fk = Object.keys(f as object), ck = Object.keys(c as object);
      const changed = [...new Set([...fk, ...ck])].filter(
        (key) => JSON.stringify((f as Record<string, unknown>)[key]) !== JSON.stringify((c as Record<string, unknown>)[key])
      );
      diffs.push(`${k}: fields differ [${changed.slice(0, 5).join(",")}]`);
    }
  }
  const ok = !missing.length && !extra.length && !diffs.length;
  console.log(`${name}: firestore=${fsDocs.size} cosmos=${cxDocs.size} missing=${missing.length} extra=${extra.length} diffs=${diffs.length} ${ok ? "OK" : "MISMATCH"}`);
  for (const d of diffs.slice(0, 5)) console.log(`  ${d}`);
  if (!ok) fail++;
}
await client.close();
console.log(fail ? `${fail} collection(s) diverged` : "SHADOW VERIFY PASSED");
process.exit(fail ? 1 : 0);
