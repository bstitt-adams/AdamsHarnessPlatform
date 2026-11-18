import { readFileSync, writeFileSync } from "node:fs";
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z_0-9]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const { adminDb } = await import("../lib/firebase-admin");
const key = ((await adminDb!.collection("platformSecrets").doc("hermes").get()).data()?.apiKey || "").trim();
if (!key) throw new Error("no apiKey in platformSecrets/hermes");
writeFileSync(".hermes-key.tmp", key);
console.log("key exported:", key.length, "chars");
process.exit(0);
