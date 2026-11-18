import { readFileSync } from "node:fs";
let key = "";
for (const line of readFileSync("C:/Users/BrianStitt/adams-hermes-docker/.env", "utf8").split("\n")) {
  const m = line.match(/^\s*HERMES_API_SERVER_KEY\s*=\s*(.+?)\s*$/);
  if (m && m[1]) key = m[1];
}
process.env.TELEGRAM_PLATFORM_INTERPRETER_URL = "http://localhost:18642/p/platformdata";
process.env.TELEGRAM_PLATFORM_INTERPRETER_API_KEY = key;
const { humanizeReply } = await import("../lib/telegram-platform");

const raw = `MY TASKS (2 shown)\n- Record abc123: "Review Q1 safety plan" status=open due=2026-11-20 priority=high\n- Record def456: "Order PPE for crew" status=open due=none priority=normal`;
const out = await humanizeReply(raw, "show my tasks");
console.log("HUMANIZED:\n" + out);

const preview = `PROPOSED UPDATE: My Tasks\nRecord ID: abc123\nBefore: {"status":"open"}\nChanges: {"status":"completed"}\nNo changes have been saved.\nReply exactly /confirm aaaa1111bbbb2222cccc3333dddd4444 within 10 minutes to save, or /cancel aaaa1111bbbb2222cccc3333dddd4444.`;
const out2 = await humanizeReply(preview, "mark review task done");
console.log("\nPREVIEW:\n" + out2);
if (!out2.includes("/confirm aaaa1111bbbb2222cccc3333dddd4444")) console.log("!!! TOKEN LOST");
process.exit(0);
