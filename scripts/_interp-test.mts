import { readFileSync } from "node:fs";
// local docker hermes api key
let key = "";
for (const line of readFileSync("C:/Users/BrianStitt/adams-hermes-docker/.env", "utf8").split("\n")) {
  const m = line.match(/^\s*HERMES_API_SERVER_KEY\s*=\s*(.+?)\s*$/);
  if (m && m[1]) key = m[1];
}
const { buildHermesConfig, requestHermesStructured } = await import("../lib/hermes/client");
const { platformIntentSchema, platformModules } = await import("../lib/telegram-platform-policy");
const moduleList = () => Object.entries(platformModules).map(([k, m]) => `${k}: ${m.label}`).join("\n");

const interpreter = buildHermesConfig("http://localhost:18642/p/platformdata", key, "hermes-agent");
try {
  const { data } = await requestHermesStructured({
    systemPrompt: `You interpret one Telegram message for Adams Platform. Return JSON matching {action: help|read|create|update|clarify, module?: key, recordId?: string, search?: string, afterId?: string, data?: object, reply?: string}. Never claim to have read or changed records. Use only the catalog below.\n${moduleList()}`,
    messages: [{ role: "user", content: "show my tasks" }],
    schema: platformIntentSchema,
  }, interpreter);
  console.log("INTENT OK:", JSON.stringify(data));
} catch (e) {
  console.log("FAILED:", (e as Error).name, "-", (e as Error).message, "| code:", (e as { code?: string }).code);
}
process.exit(0);
