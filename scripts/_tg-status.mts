import { readFileSync } from "node:fs";
let tok = "";
for (const line of readFileSync("C:/Users/BrianStitt/adams-hermes-docker/env/hermes.env", "utf8").split("\n")) {
  const m = line.match(/^\s*TELEGRAM_BOT_TOKEN\s*=\s*(.+?)\s*$/);
  if (m && m[1] && !line.trim().startsWith("#")) tok = m[1];
}
const base = `https://api.telegram.org/bot${tok}`;
const info = await (await fetch(`${base}/getWebhookInfo`)).json();
const r = info.result;
console.log(JSON.stringify({ url: r.url, pending: r.pending_update_count, lastError: r.last_error_message, lastErrorDate: r.last_error_date ? new Date(r.last_error_date * 1000).toISOString() : null, maxConn: r.max_connections, allowed: r.allowed_updates }, null, 1));
process.exit(0);
