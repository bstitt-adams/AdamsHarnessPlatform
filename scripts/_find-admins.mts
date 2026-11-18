import { readFileSync } from "node:fs";
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z_0-9]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const { adminDb } = await import("../lib/firebase-admin");
const snap = await adminDb!.collection("users").get();
for (const d of snap.docs) {
  const u = d.data();
  if (["admin", "superadmin"].includes(String(u.role || "").toLowerCase())) {
    console.log(d.id, "|", u.email || "", "|", u.displayName || u.name || "", "|", u.role);
  }
}
process.exit(0);
