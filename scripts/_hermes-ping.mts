import { config } from "dotenv";
config({ path: ".env.local" });
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
const key = process.env.FIREBASE_PRIVATE_KEY?.replace(/\n/g, "\n");
initializeApp({ credential: cert({ projectId: process.env.FIREBASE_PROJECT_ID, clientEmail: process.env.FIREBASE_CLIENT_EMAIL, privateKey: key }) });
const db = getFirestore();
const sec = await db.collection("platformSecrets").doc("hermes").get();
const apiKey = sec.data()?.apiKey as string;
const base = process.argv[2] || "http://localhost:18642";
const t0 = Date.now();
const r = await fetch(`${base}/v1/chat/completions`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
  body: JSON.stringify({ model: "hermes-agent", messages: [{ role: "user", content: "Reply with exactly: PONG" }], max_tokens: 8 }),
  signal: AbortSignal.timeout(60_000),
});
const ms = Date.now() - t0;
const text = await r.text();
console.log(`HTTP ${r.status} in ${ms}ms`);
console.log(text.slice(0, 500));
process.exit(0);
