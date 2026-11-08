import type { AssetProvider } from "@/lib/schema";
import type { AssetIntegrationOperation, IntegrationRemediationError } from "./types";

export class AssetIntegrationError extends Error {
  constructor(
    public provider: AssetProvider,
    public operation: AssetIntegrationOperation,
    message: string,
    public remediation: string[],
    public options: {
      remoteId?: string;
      vendorStatus?: number;
      vendorCode?: string;
      capability?: string;
      retryable?: boolean;
    } = {},
  ) {
    super(message);
    this.name = "AssetIntegrationError";
  }

  toJSON(): IntegrationRemediationError {
    return {
      error: this.message,
      provider: this.provider,
      operation: this.operation,
      remoteId: this.options.remoteId,
      vendorStatus: this.options.vendorStatus,
      vendorCode: this.options.vendorCode,
      remediation: this.remediation,
      capability: this.options.capability,
      retryable: this.options.retryable ?? false,
    };
  }
}

export function unsupportedOperation(provider: AssetProvider, operation: AssetIntegrationOperation, capability: string, remediation: string[], remoteId?: string) {
  return new AssetIntegrationError(provider, operation, `${provider === "jamf" ? "Jamf" : "NinjaOne"} does not support ${operation} for ${capability} through the configured API path.`, remediation, {
    capability,
    remoteId,
    vendorStatus: 409,
    retryable: false,
  });
}

export function errorPayload(error: unknown, provider: AssetProvider, operation: AssetIntegrationOperation): IntegrationRemediationError {
  if (error instanceof AssetIntegrationError) return error.toJSON();
  return {
    error: error instanceof Error ? error.message : `${provider} ${operation} failed`,
    provider,
    operation,
    remediation: ["Check the integration credentials, provider object type, and configured remote identifiers, then retry the operation."],
    retryable: false,
  };
}

export function jamfRemediation(status: number, operation: AssetIntegrationOperation, objectType: string): string[] {
  if (status === 401) {
    return [
      "In Jamf Pro, open Settings > Jamf Pro API Roles and Clients.",
      "Verify the API Client ID and generate a new Client Secret if necessary.",
      "Confirm the Adams Platform is using the correct Jamf Cloud base URL, then retry the connection test.",
    ];
  }
  if (status === 403) {
    return [
      "In Jamf Pro, open Settings > Jamf Pro API Roles and Clients and edit the API Role assigned to this client.",
      `Grant the required ${operation} privilege for ${objectType}; for full asset CRUD include Read, Create, Update, and Delete Computers, plus Read and Update Mobile Devices.`,
      "Save the role, wait for Jamf permissions to propagate, then rerun Check CRUD Capabilities.",
    ];
  }
  if (status === 404) {
    if (operation === "authenticate") {
      return [
        "The Jamf tenant URL is wrong or the OAuth endpoint is unavailable on this tenant.",
        "In Asset Integrations, set Jamf Tenant URL to your real Jamf Cloud host, e.g. https://yourcompany.jamfcloud.com.",
        "Confirm the Jamf Pro version supports the Pro API OAuth token endpoint, then rerun Test.",
      ];
    }
    return [
      `Confirm the ${objectType} record still exists in Jamf Pro.`,
      "Run Import/Link Remote Devices to refresh remote IDs before retrying the operation.",
    ];
  }
  if (status === 400 || status === 422) {
    return [
      "Review the Jamf validation message and complete any required inventory identifiers such as UDID, serial number, name, or asset tag.",
      "If extension attributes fail, create text attributes for Adams Asset ID, Adams Asset Status, and Adams Team Member ID in Jamf Pro.",
    ];
  }
  return ["Check the Jamf Pro URL, network access, API role privileges, and Jamf service status, then retry."];
}

export function ninjaRemediation(status: number, operation: AssetIntegrationOperation, objectType: string): string[] {
  if (status === 400 || status === 422) {
    return [
      "Verify the configured NinjaOne Organization ID, Location ID, and Unmanaged Device Role ID.",
      "The unmanaged role must be a sub-role of Unmanaged Device; update Administration > Devices > Roles if needed.",
      "Review the NinjaOne validation message and retry the operation.",
    ];
  }
  if (status === 401) {
    return [
      "In NinjaOne, open Administration > Apps > API > Client App IDs.",
      "Confirm the application uses the API Services (machine-to-machine) platform and the Client Credentials grant type.",
      "Verify the selected region/host and regenerate the Client Secret if necessary.",
    ];
  }
  if (status === 403) {
    return [
      "In NinjaOne, open Administration > Apps > API > Client App IDs and edit the Adams Platform app.",
      `Grant the Management scope for ${operation}; Monitoring alone is read-only.`,
      "Save the app, request a new token, and rerun Check CRUD Capabilities.",
    ];
  }
  if (status === 404) {
    return [
      `Confirm the ${objectType} record still exists in the selected NinjaOne tenant and region.`,
      "Run Import/Link Remote Devices to refresh remote IDs before retrying.",
    ];
  }
  return ["Check the NinjaOne region, API scopes, organization/location/role configuration, and service status, then retry."];
}
