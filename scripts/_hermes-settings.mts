import { readFileSync } from "node:fs";
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z_0-9]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const { adminDb } = await import("../lib/firebase-admin");
const s = (await adminDb!.collection("platformSettings").doc("global").get()).data();
console.log("hermes settings:", JSON.stringify(s?.hermes || null));
process.exit(0);
