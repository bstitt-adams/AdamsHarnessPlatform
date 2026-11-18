import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z_0-9]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const { adminDb } = await import("../lib/firebase-admin");
const hermes = (await adminDb!.collection("platformSecrets").doc("hermes").get()).data() || {};
const stored = String(hermes.apiKey || hermes.hermesApiKey || "").trim();
let azureKey = "";
for (const f of [".env", "env/hermes.env"]) {
  try {
    for (const line of readFileSync(`C:/Users/BrianStitt/adams-hermes-docker/${f}`, "utf8").split("\n")) {
      const m = line.match(/^\s*(HERMES_API_SERVER_KEY|API_SERVER_KEY)\s*=\s*(.+?)\s*$/);
      if (m && m[2] && !line.trim().startsWith("#")) azureKey = m[2];
    }
  } catch {}
}
const h = (s: string) => createHash("sha256").update(s).digest("hex").slice(0, 12);
console.log("stored fields:", Object.keys(hermes).join(","));
console.log("stored apiRoot:", hermes.apiRoot || hermes.endpoint || "(none)");
console.log("stored model:", hermes.model || "(none)");
console.log("stored key sha:", stored ? h(stored) : "EMPTY");
console.log("azure-side key sha:", azureKey ? h(azureKey) : "EMPTY");
console.log("match:", stored && stored === azureKey ? "YES" : "NO");
process.exit(0);
