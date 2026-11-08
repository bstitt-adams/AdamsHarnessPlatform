import "dotenv/config";
import { config as loadLocal } from "dotenv";
loadLocal({ path: ".env.local", override: true });

import { resolveAssetIntegrationConfig } from "../lib/asset-integrations/config";
import { runAssetIntegrationTest } from "../lib/asset-integrations/capability-test";
import { getProviderClient } from "../lib/asset-integrations/providers";

async function main() {
  const mode = (process.argv[2] || "connectivity") as "connectivity" | "capability" | "crud";
  const config = await resolveAssetIntegrationConfig();
  console.log("Resolved configuration:", {
    jamf: { enabled: config.jamf.enabled, baseUrl: config.jamf.baseUrl, clientIdSet: Boolean(config.jamf.clientId), secretSet: Boolean(config.jamf.clientSecret) },
    ninjaOne: { enabled: config.ninjaOne.enabled, baseUrl: config.ninjaOne.baseUrl, region: config.ninjaOne.region, clientIdSet: Boolean(config.ninjaOne.clientId), secretSet: Boolean(config.ninjaOne.clientSecret), orgId: config.ninjaOne.organizationId, locationId: config.ninjaOne.locationId, roleId: config.ninjaOne.unmanagedRoleId },
  });

  for (const provider of ["jamf", "ninjaOne"] as const) {
    console.log(`\n=== ${provider} ===`);
    try {
      const client = getProviderClient(provider, config);
      const conn = await client.testConnection();
      console.log("CONNECTIVITY:", conn.message);
      try {
        const page = await client.listDevices("");
        console.log(`LIST: ${page.assets.length} record(s)${page.nextCursor ? `, nextCursor=${page.nextCursor}` : ""}`);
        for (const asset of page.assets.slice(0, 3)) {
          console.log(`  - ${asset.remoteType} ${asset.remoteId} | ${asset.displayName} | serial=${asset.serialNumber || "—"} | owner=${asset.ownerEmail || asset.ownerName || "—"}`);
        }
      } catch (e) {
        console.log("LIST FAILED:", e instanceof Error ? e.message : e);
      }
      if (mode !== "connectivity") {
        const result = await runAssetIntegrationTest(provider, config, mode);
        console.log(`TEST(${mode}):`, result.message);
        for (const err of result.errors || []) {
          console.log("  ERROR:", err.error);
          for (const step of err.remediation) console.log("    →", step);
        }
      }
    } catch (e) {
      console.log("FAILED:", e instanceof Error ? e.message : e);
      if (e && typeof e === "object" && "remediation" in e) {
        for (const step of (e as { remediation?: string[] }).remediation || []) console.log("  →", step);
      }
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
