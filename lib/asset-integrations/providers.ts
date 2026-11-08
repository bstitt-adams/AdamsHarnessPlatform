import type { AssetProvider } from "@/lib/schema";
import { AssetIntegrationError } from "./errors";
import { JamfClient } from "./jamf";
import { NinjaOneClient } from "./ninjaone";
import type { AssetIntegrationConfig, AssetManagementProviderClient, ProviderCapabilities } from "./types";

export function providerCapabilities(provider: AssetProvider): ProviderCapabilities[] {
  if (provider === "jamf") {
    return [
      {
        provider,
        remoteType: "jamfComputer",
        capabilities: { read: true, create: true, update: true, delete: true, assignOwner: true },
        notes: ["Uses Jamf Pro computer inventory v4 endpoints."],
      },
      {
        provider,
        remoteType: "jamfMobile",
        capabilities: { read: true, create: false, update: true, delete: false, assignOwner: true },
        notes: ["Current Jamf mobile-device API supports read/update; create/delete require enrollment or deprecated legacy workflows."],
      },
    ];
  }
  return [
    {
      provider,
      remoteType: "ninjaManaged",
      capabilities: { read: true, create: false, update: true, delete: false, decommission: true, assignOwner: true },
      notes: ["Managed devices are discovered after NinjaOne agent enrollment; decommission is the safest lifecycle."],
    },
    {
      provider,
      remoteType: "ninjaStaged",
      capabilities: { read: true, create: true, update: true, delete: false, decommission: true, assignOwner: true },
      notes: ["Staged devices can be created through the public API but do not become managed until the agent checks in."],
    },
    {
      provider,
      remoteType: "ninjaUnmanaged",
      capabilities: { read: true, create: true, update: true, delete: true, decommission: true, assignOwner: true },
      notes: ["NinjaOne unmanaged ITAM records support the closest complete CRUD lifecycle."],
    },
  ];
}

export function getProviderClient(provider: AssetProvider, config: AssetIntegrationConfig): AssetManagementProviderClient {
  if (provider === "jamf") {
    if (!config.jamf.enabled) {
      throw new AssetIntegrationError("jamf", "authenticate", "Jamf integration is disabled.", ["Enable Jamf in Asset Integrations and save the OAuth configuration before retrying."]);
    }
    return new JamfClient(config.jamf);
  }
  if (!config.ninjaOne.enabled) {
    throw new AssetIntegrationError("ninjaOne", "authenticate", "NinjaOne integration is disabled.", ["Enable NinjaOne in Asset Integrations and save the OAuth configuration before retrying."]);
  }
  return new NinjaOneClient(config.ninjaOne);
}

export function providerLabel(provider: AssetProvider) {
  return provider === "jamf" ? "Jamf Pro" : "NinjaOne";
}
