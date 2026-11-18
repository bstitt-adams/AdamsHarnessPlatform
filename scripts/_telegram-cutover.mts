import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";

// Load platform admin creds
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z_0-9]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

// Read the bot token from the Hermes env file (never printed)
let botToken = "";
for (const line of readFileSync("C:/Users/BrianStitt/adams-hermes-docker/env/hermes.env", "utf8").split("\n")) {
  const m = line.match(/^\s*TELEGRAM_BOT_TOKEN\s*=\s*(.+?)\s*$/);
  if (m && !line.trim().startsWith("#") && m[1]) botToken = m[1];
}
if (!botToken) throw new Error("TELEGRAM_BOT_TOKEN not found in hermes.env");

const PLATFORM_ADMIN_UID = "PvG7StACS0UWTDBxE60JzECffii1"; // brianstitt@adams-electric.com (superadmin)
const PLATFORM_ADMIN_TG_ID = "5894137408";
const WEBHOOK_URL = "https://adams-platform.delightfulground-f63f4c08.eastus2.azurecontainerapps.io/api/telegram/webhook";
const base = `https://api.telegram.org/bot${botToken}`;

const me = await (await fetch(`${base}/getMe`)).json();
if (!me.ok) throw new Error(`getMe failed: ${JSON.stringify(me)}`);
console.log("Bot:", `@${me.result.username}`, `(${me.result.first_name})`);

const webhookSecret = randomBytes(32).toString("hex");
const sw = await (await fetch(`${base}/setWebhook`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ url: WEBHOOK_URL, secret_token: webhookSecret, allowed_updates: ["message"] }),
})).json();
if (!sw.ok) throw new Error(`setWebhook failed: ${JSON.stringify(sw)}`);
console.log("setWebhook: OK ->", WEBHOOK_URL);

const { adminDb } = await import("../lib/firebase-admin");
await adminDb!.collection("platformSecrets").doc("telegram").set({
  enabled: true,
  botToken,
  webhookSecret,
  webhookUrl: WEBHOOK_URL,
  botUsername: me.result.username || "",
  platformDataEnabled: true,
  platformAdminUid: PLATFORM_ADMIN_UID,
  platformAdminTelegramUserId: PLATFORM_ADMIN_TG_ID,
  updatedAt: new Date(),
}, { merge: true });
await adminDb!.collection("platformSettings").doc("global").set({
  telegram: {
    enabled: true,
    platformDataEnabled: true,
    platformAdminTelegramUserId: PLATFORM_ADMIN_TG_ID,
    webhookUrl: WEBHOOK_URL,
    botUsername: me.result.username || "",
    status: "connected",
    lastTested: new Date(),
  },
  updatedAt: new Date(),
}, { merge: true });
console.log("Firestore config written (admin-bound, platform data enabled)");

const info = await (await fetch(`${base}/getWebhookInfo`)).json();
console.log("webhookInfo:", JSON.stringify({ url: info.result?.url, pending: info.result?.pending_update_count, lastError: info.result?.last_error_message || null }));
process.exit(0);
