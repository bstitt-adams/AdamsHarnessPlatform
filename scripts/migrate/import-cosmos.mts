/**
 * Imports the NDJSON export into Cosmos DB (Mongo API).
 * - `{__ts: iso}` markers → BSON Date
 * - doc `_id` kept as the Cosmos _id (upsert → idempotent re-runs)
 * - subcollection files (`parent__sub.ndjson`) → collection `parent__sub`
 * --only=name1,name2 restricts which files import (resume support).
 * Single-doc paced writes stay under the free-tier RU ceiling.
 */
import { readFileSync, readdirSync, createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import path from "node:path";

for (const l of readFileSync(".env.local", "utf8").split("\n")) {
  const m = l.match(/^\s*([A-Z_0-9]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const { MongoClient } = await import("mongodb");

const DATA = path.join("scripts", "migrate", "data");
const uri = process.env.COSMOS_CONNECTION_STRING;
if (!uri) { console.error("COSMOS_CONNECTION_STRING not set"); process.exit(1); }
const onlyIdx = process.argv.indexOf("--only");
const only = onlyIdx > -1 ? new Set(process.argv[onlyIdx + 1].split(",")) : null;

const revive = (v: unknown): unknown => {
  if (v == null || typeof v !== "object") return v;
  if (Array.isArray(v)) return v.map(revive);
  const o = v as Record<string, unknown>;
  if (typeof o.__ts === "string") return new Date(o.__ts);
  const out: Record<string, unknown> = {};
  for (const [k, x] of Object.entries(o)) out[k] = revive(x);
  return out;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const client = new MongoClient(uri, { appName: "adams-migrate" });
await client.connect();
const db = client.db(process.env.COSMOS_DB_NAME || "adams");

for (const f of readdirSync(DATA).filter((x) => x.endsWith(".ndjson") && (!only || only.has(x.replace(/\.ndjson$/, ""))))) {
  const coll = db.collection(f.replace(/\.ndjson$/, ""));
  const rl = createInterface({ input: createReadStream(path.join(DATA, f)) });
  let n = 0;
  for await (const line of rl) {
    if (!line.trim()) continue;
    const doc = revive(JSON.parse(line)) as Record<string, unknown>;
    for (let attempt = 0; ; attempt++) {
      try {
        await coll.replaceOne({ _id: doc._id }, doc as never, { upsert: true });
        n++;
        break;
      } catch (e) {
        const code = (e as { code?: number }).code;
        if ((code === 16500 || code === 50) && attempt < 40) { await sleep(Math.min(300 * (attempt + 1), 5000)); continue; }
        throw e;
      }
    }
    await sleep(30); // pace under the free-tier RU ceiling
  }
  console.log(`${f}: ${n} docs`);
}
await client.close();
console.log("DONE");
process.exit(0);
