import type { AssetProvider } from "@/lib/schema";
import { errorPayload } from "./errors";
import { getProviderClient, providerCapabilities, providerLabel } from "./providers";
import type { AssetIntegrationConfig, AssetPushPayload, IntegrationRemediationError, IntegrationTestResult } from "./types";

export type AssetIntegrationTestMode = "connectivity" | "capability" | "crud";

function smokeAsset(provider: AssetProvider): AssetPushPayload {
  const stamp = Date.now();
  return {
    id: `api-smoke-${provider}-${stamp}`,
    assetName: `ADAMS API SMOKE TEST ${stamp}`,
    assetType: "laptop",
    assetTag: `API-SMOKE-${stamp}`,
    serialNumber: `API-SMOKE-${stamp}`,
    identifier: `API-SMOKE-${stamp}`,
    manufacturer: "Adams Platform",
    model: "API Connectivity Test",
    status: "available",
    notes: "Temporary record created by the Adams Platform integration smoke test.",
  };
}

export async function runAssetIntegrationTest(provider: AssetProvider, config: AssetIntegrationConfig, mode: AssetIntegrationTestMode): Promise<IntegrationTestResult> {
  const client = getProviderClient(provider, config);
  const capabilities = providerCapabilities(provider);
  try {
    if (mode === "connectivity") {
      const result = await client.testConnection();
      return { ...result, capabilities };
    }
    if (mode === "capability") {
      const result = await client.testConnection();
      return {
        ...result,
        message: `${providerLabel(provider)} connectivity succeeded. Capability matrix reflects the public API and configured object types; run the explicit CRUD smoke test to verify write permissions.`,
        capabilities,
      };
    }

    const asset = smokeAsset(provider);
    const errors: IntegrationRemediationError[] = [];
    const steps: string[] = [];
    let remoteId = "";
    try {
      const created = await client.createAsset(asset);
      remoteId = created.remoteId;
      steps.push(`created ${created.remoteType}:${remoteId}`);
      await client.getDevice(created.remoteType, remoteId);
      steps.push("read");
      await client.updateAsset(created.remoteType, remoteId, { ...asset, notes: "Updated by the Adams Platform API smoke test." });
      steps.push("updated");
      await client.lifecycleAsset(created.remoteType, remoteId, provider === "ninjaOne" && created.remoteType !== "ninjaUnmanaged" ? "decommission" : "delete");
      steps.push(provider === "ninjaOne" && created.remoteType !== "ninjaUnmanaged" ? "decommissioned" : "deleted");
    } catch (error) {
      errors.push(errorPayload(error, provider, "sync"));
      if (remoteId) {
        try {
          await client.lifecycleAsset(provider === "jamf" ? "jamfComputer" : "ninjaUnmanaged", remoteId, "delete");
          steps.push("cleanup deleted");
        } catch {
          steps.push("cleanup failed; review the remote smoke-test record manually");
        }
      }
      return { ok: false, provider, message: `${providerLabel(provider)} CRUD smoke test failed after: ${steps.join(" → ") || "authentication"}.`, capabilities, errors };
    }
    return { ok: true, provider, message: `${providerLabel(provider)} CRUD smoke test succeeded (${steps.join(" → ")}).`, capabilities };
  } catch (error) {
    return { ok: false, provider, message: `${providerLabel(provider)} test failed.`, capabilities, errors: [errorPayload(error, provider, "authenticate")] };
  }
}
