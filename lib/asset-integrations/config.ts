import { adminDb } from "@/lib/firebase-admin";
import type { AssetIntegrationConfig } from "./types";

const SECRETS_DOC = "assetManagement";

export const defaultAssetIntegrationConfig: AssetIntegrationConfig = {
  jamf: {
    enabled: false,
    baseUrl: "",
    clientId: "",
    clientSecret: "",
    syncComputers: true,
    syncMobileDevices: true,
    allowLegacyMobileWriteApi: false,
    importUnmatched: true,
  },
  ninjaOne: {
    enabled: false,
    region: "app",
    baseUrl: "",
    clientId: "",
    clientSecret: "",
    organizationId: undefined,
    locationId: undefined,
    unmanagedRoleId: undefined,
    createMode: "unmanaged",
    importUnmatched: true,
  },
};

function numberOrUndefined(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

export function ninjaBaseUrl(region?: string, explicit?: string) {
  const custom = String(explicit || "").trim().replace(/\/+$/, "");
  if (custom) return custom;
  const host = String(region || "app").trim() || "app";
  return `https://${host}.ninjarmm.com`;
}

export async function resolveAssetIntegrationConfig(): Promise<AssetIntegrationConfig> {
  const envConfig: AssetIntegrationConfig = {
    jamf: {
      ...defaultAssetIntegrationConfig.jamf,
      enabled: Boolean(process.env.JAMF_CLIENT_ID && process.env.JAMF_CLIENT_SECRET),
      baseUrl: (process.env.JAMF_BASE_URL || "").replace(/\/+$/, ""),
      clientId: process.env.JAMF_CLIENT_ID || "",
      clientSecret: process.env.JAMF_CLIENT_SECRET || "",
    },
    ninjaOne: {
      ...defaultAssetIntegrationConfig.ninjaOne,
      enabled: Boolean(process.env.NINJAONE_CLIENT_ID && process.env.NINJAONE_CLIENT_SECRET),
      region: process.env.NINJAONE_REGION || "app",
      baseUrl: ninjaBaseUrl(process.env.NINJAONE_REGION, process.env.NINJAONE_BASE_URL),
      clientId: process.env.NINJAONE_CLIENT_ID || "",
      clientSecret: process.env.NINJAONE_CLIENT_SECRET || "",
      organizationId: numberOrUndefined(process.env.NINJAONE_ORGANIZATION_ID),
      locationId: numberOrUndefined(process.env.NINJAONE_LOCATION_ID),
      unmanagedRoleId: numberOrUndefined(process.env.NINJAONE_UNMANAGED_ROLE_ID),
    },
  };

  if (!adminDb) return envConfig;
  try {
    const [settingsSnap, secretsSnap] = await Promise.all([
      adminDb.collection("platformSettings").doc("global").get(),
      adminDb.collection("platformSecrets").doc(SECRETS_DOC).get(),
    ]);
    const settings = settingsSnap.data()?.assetIntegrations as Partial<AssetIntegrationConfig> | undefined;
    const secrets = secretsSnap.data() as Partial<AssetIntegrationConfig> | undefined;
    const storedJamf = settings?.jamf;
    const storedNinja = settings?.ninjaOne;
    const secretJamf = secrets?.jamf;
    const secretNinja = secrets?.ninjaOne;

    return {
      jamf: {
        ...envConfig.jamf,
        ...storedJamf,
        clientId: String(secretJamf?.clientId || storedJamf?.clientId || envConfig.jamf.clientId || ""),
        clientSecret: String(secretJamf?.clientSecret || envConfig.jamf.clientSecret || ""),
        baseUrl: String(storedJamf?.baseUrl || envConfig.jamf.baseUrl || "").replace(/\/+$/, ""),
      },
      ninjaOne: {
        ...envConfig.ninjaOne,
        ...storedNinja,
        clientId: String(secretNinja?.clientId || storedNinja?.clientId || envConfig.ninjaOne.clientId || ""),
        clientSecret: String(secretNinja?.clientSecret || envConfig.ninjaOne.clientSecret || ""),
        baseUrl: ninjaBaseUrl(storedNinja?.region || envConfig.ninjaOne.region, storedNinja?.baseUrl || envConfig.ninjaOne.baseUrl),
        organizationId: numberOrUndefined(storedNinja?.organizationId ?? envConfig.ninjaOne.organizationId),
        locationId: numberOrUndefined(storedNinja?.locationId ?? envConfig.ninjaOne.locationId),
        unmanagedRoleId: numberOrUndefined(storedNinja?.unmanagedRoleId ?? envConfig.ninjaOne.unmanagedRoleId),
      },
    };
  } catch {
    return envConfig;
  }
}

export function publicAssetIntegrationStatus(config: AssetIntegrationConfig) {
  return {
    jamf: {
      enabled: config.jamf.enabled,
      configured: Boolean(config.jamf.baseUrl && config.jamf.clientId && config.jamf.clientSecret),
      baseUrl: config.jamf.baseUrl,
      syncComputers: config.jamf.syncComputers,
      syncMobileDevices: config.jamf.syncMobileDevices,
      allowLegacyMobileWriteApi: config.jamf.allowLegacyMobileWriteApi,
      importUnmatched: config.jamf.importUnmatched,
      clientIdConfigured: Boolean(config.jamf.clientId),
      clientSecretConfigured: Boolean(config.jamf.clientSecret),
    },
    ninjaOne: {
      enabled: config.ninjaOne.enabled,
      configured: Boolean(config.ninjaOne.baseUrl && config.ninjaOne.clientId && config.ninjaOne.clientSecret),
      region: config.ninjaOne.region,
      baseUrl: config.ninjaOne.baseUrl,
      organizationId: config.ninjaOne.organizationId,
      locationId: config.ninjaOne.locationId,
      unmanagedRoleId: config.ninjaOne.unmanagedRoleId,
      createMode: config.ninjaOne.createMode,
      importUnmatched: config.ninjaOne.importUnmatched,
      clientIdConfigured: Boolean(config.ninjaOne.clientId),
      clientSecretConfigured: Boolean(config.ninjaOne.clientSecret),
    },
  };
}
