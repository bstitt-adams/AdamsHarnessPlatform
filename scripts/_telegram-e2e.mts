import { readFileSync } from "node:fs";
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z_0-9]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const { adminDb } = await import("../lib/firebase-admin");
const sec = (await adminDb!.collection("platformSecrets").doc("telegram").get()).data()!;
const url = sec.webhookUrl;
const secret = sec.webhookSecret;
const TG_ID = Number(sec.platformAdminTelegramUserId);
const text = process.argv[2] || "/start";

const res = await fetch(url, {
  method: "POST",
  headers: { "content-type": "application/json", "x-telegram-bot-api-secret-token": secret },
  body: JSON.stringify({
    update_id: Math.floor(Math.random() * 1e9),
    message: {
      message_id: Math.floor(Math.random() * 1e6),
      from: { id: TG_ID, is_bot: false, first_name: "Brian", username: "brianstitt" },
      chat: { id: TG_ID, type: "private" },
      date: Math.floor(Date.now() / 1000),
      text,
    },
  }),
});
console.log("webhook:", res.status, await res.text());
process.exit(0);
