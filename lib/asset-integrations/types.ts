import type { AssetProvider, AssetRemoteCapability, AssetRemoteType } from "@/lib/schema";

export type AssetIntegrationOperation = "authenticate" | "create" | "read" | "update" | "delete" | "decommission" | "retire" | "assign" | "sync" | "link";

export interface IntegrationRemediationError {
  error: string;
  provider: AssetProvider;
  operation: AssetIntegrationOperation;
  remoteId?: string;
  vendorStatus?: number;
  vendorCode?: string;
  remediation: string[];
  capability?: string;
  retryable: boolean;
}

export interface AssetIntegrationConfig {
  jamf: {
    enabled: boolean;
    baseUrl: string;
    clientId: string;
    clientSecret: string;
    syncComputers: boolean;
    syncMobileDevices: boolean;
    allowLegacyMobileWriteApi: boolean;
    importUnmatched: boolean;
  };
  ninjaOne: {
    enabled: boolean;
    region: string;
    baseUrl: string;
    clientId: string;
    clientSecret: string;
    organizationId?: number;
    locationId?: number;
    unmanagedRoleId?: number;
    createMode: "linkOnly" | "unmanaged" | "staged";
    importUnmatched: boolean;
  };
}

export interface ProviderCapabilities {
  provider: AssetProvider;
  remoteType: AssetRemoteType;
  capabilities: Partial<Record<AssetRemoteCapability, boolean>>;
  notes: string[];
}

export interface IntegrationTestResult {
  ok: boolean;
  provider: AssetProvider;
  message: string;
  remoteCount?: number;
  capabilities?: ProviderCapabilities[];
  errors?: IntegrationRemediationError[];
}

export interface RemoteAsset {
  provider: AssetProvider;
  remoteType: AssetRemoteType;
  remoteId: string;
  remoteUrl?: string;
  displayName: string;
  serialNumber?: string;
  assetTag?: string;
  manufacturer?: string;
  model?: string;
  status?: string;
  approvalStatus?: string;
  ownerUid?: string;
  ownerName?: string;
  ownerEmail?: string;
  phoneNumber?: string;
  organizationId?: number;
  locationId?: number;
  roleId?: number;
  lastContact?: string;
  purchaseDate?: string;
  purchaseCost?: number;
  warrantyEndDate?: string;
  notes?: string;
  raw: Record<string, unknown>;
}

export interface RemoteAssetPage {
  assets: RemoteAsset[];
  nextCursor?: string;
}

export interface AssetPushPayload {
  id: string;
  assetName: string;
  assetType?: string;
  assetTag?: string;
  serialNumber?: string;
  identifier?: string;
  manufacturer?: string;
  model?: string;
  status?: string;
  condition?: string;
  assignedToTeamMemberId?: string;
  assignedToName?: string;
  assignedToEmail?: string;
  assignedToUid?: string;
  phoneNumber?: string;
  purchaseDate?: string;
  purchaseCost?: number;
  warrantyExpiration?: string;
  notes?: string;
}

export interface AssetManagementProviderClient {
  provider: AssetProvider;
  testConnection(): Promise<IntegrationTestResult>;
  listDevices(cursor?: string): Promise<RemoteAssetPage>;
  getDevice(remoteType: AssetRemoteType, remoteId: string): Promise<RemoteAsset>;
  createAsset(asset: AssetPushPayload): Promise<RemoteAsset>;
  updateAsset(remoteType: AssetRemoteType, remoteId: string, asset: AssetPushPayload): Promise<RemoteAsset>;
  lifecycleAsset(remoteType: AssetRemoteType, remoteId: string, mode: "delete" | "decommission" | "retire"): Promise<void>;
  assignOwner(remoteType: AssetRemoteType, remoteId: string, member: { email: string; name: string; firebaseUid?: string } | null): Promise<void>;
}

export interface AssetSyncOutcome {
  status: "success" | "partial" | "failed" | "skipped";
  remote?: RemoteAsset;
  message?: string;
  remediation?: string[];
}
