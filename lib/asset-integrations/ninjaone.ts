import type { AssetRemoteType } from "@/lib/schema";
import { AssetIntegrationError, ninjaRemediation, unsupportedOperation } from "./errors";
import { ninjaManagedPayload, ninjaStagedPayload, ninjaUnmanagedPayload, normalizeKey } from "./mapper";
import type { AssetIntegrationConfig, AssetManagementProviderClient, AssetPushPayload, IntegrationTestResult, RemoteAsset, RemoteAssetPage } from "./types";

type NinjaConfig = AssetIntegrationConfig["ninjaOne"];
type JsonRecord = Record<string, unknown>;

const tokenCache = new Map<string, { token: string; expiresAt: number }>();

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function firstString(...values: unknown[]) {
  return values.find((value): value is string => typeof value === "string" && value.trim().length > 0)?.trim();
}

function firstNumber(...values: unknown[]) {
  return values.map((value) => Number(value)).find((value) => Number.isFinite(value));
}

function remoteTypeFor(record: JsonRecord): AssetRemoteType {
  const nodeClass = String(record.nodeClass || "").toUpperCase();
  const approval = String(record.approvalStatus || "").toUpperCase();
  if (nodeClass === "UNMANAGED_DEVICE" || nodeClass === "MANAGED_DEVICE" && firstNumber(record.isOffline) === undefined && !record.systemName) return "ninjaUnmanaged";
  if (approval === "STAGED") return "ninjaStaged";
  if (nodeClass === "UNMANAGED_DEVICE") return "ninjaUnmanaged";
  return "ninjaManaged";
}

function mapDevice(item: JsonRecord): RemoteAsset {
  const owner = asRecord(item.assignedOwner);
  const references = asRecord(item.references);
  const assetFields = asRecord(item.assetFields);
  const warranty = asRecord(item.warranty);
  const remoteType = remoteTypeFor(item);
  return {
    provider: "ninjaOne",
    remoteType,
    remoteId: String(item.id || item.nodeId || ""),
    displayName: firstString(item.displayName, item.systemName, item.dnsName, item.netbiosName) || "NinjaOne Device",
    serialNumber: firstString(item.serialNumber, assetFields.serialNumber, asRecord(item.system).serialNumber),
    assetTag: firstString(item.assetTag, assetFields.assetId, asRecord(item.userData).adamsAssetTag),
    manufacturer: firstString(item.manufacturer, asRecord(item.system).manufacturer),
    model: firstString(item.model, asRecord(item.system).model),
    status: firstString(item.status, item.approvalStatus, item.maintenance) || "active",
    approvalStatus: firstString(item.approvalStatus),
    ownerUid: firstString(item.assignedOwnerUid, owner.uid),
    ownerName: [firstString(owner.firstName), firstString(owner.lastName)].filter(Boolean).join(" ") || undefined,
    ownerEmail: firstString(owner.email, references && firstString(asRecord(references.assignedOwner).email)),
    organizationId: firstNumber(item.organizationId),
    locationId: firstNumber(item.locationId),
    roleId: firstNumber(item.nodeRoleId),
    lastContact: firstString(item.lastContact, item.lastUpdate),
    warrantyEndDate: warranty.endDate ? new Date(Number(warranty.endDate) * 1000).toISOString().slice(0, 10) : undefined,
    purchaseDate: assetFields.assetPurchaseDate ? new Date(Number(assetFields.assetPurchaseDate) * 1000).toISOString().slice(0, 10) : undefined,
    purchaseCost: firstNumber(assetFields.assetPurchaseAmount),
    raw: item,
  };
}

export class NinjaOneClient implements AssetManagementProviderClient {
  provider = "ninjaOne" as const;
  constructor(private config: NinjaConfig) {}

  private get baseUrl() {
    return this.config.baseUrl.replace(/\/+$/, "");
  }

  private async token() {
    if (!this.baseUrl || !this.config.clientId || !this.config.clientSecret) {
      throw new AssetIntegrationError("ninjaOne", "authenticate", "NinjaOne OAuth configuration is incomplete.", ninjaRemediation(401, "authenticate", "NinjaOne"));
    }
    const cacheKey = `${this.baseUrl}:${this.config.clientId}`;
    const cached = tokenCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now() + 30_000) return cached.token;
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/ws/oauth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
        body: new URLSearchParams({ grant_type: "client_credentials", client_id: this.config.clientId, client_secret: this.config.clientSecret, scope: "monitoring management" }),
        signal: AbortSignal.timeout(15_000),
      });
    } catch {
      throw new AssetIntegrationError("ninjaOne", "authenticate", `Cannot reach ${this.baseUrl}.`, [
        "Verify the NinjaOne Region setting matches your tenant. Valid hosts include app, us2, us3, eu, ca, and oc (e.g. https://us2.ninjarmm.com).",
        "Check the URL you use to sign in to the NinjaOne console and use the same region prefix.",
        "Confirm the machine running Adams Platform has outbound HTTPS access, then rerun Test.",
      ]);
    }
    const text = await response.text();
    let data: JsonRecord = {};
    try { data = asRecord(JSON.parse(text)); } catch { data = { error: text }; }
    if (!response.ok) {
      throw new AssetIntegrationError("ninjaOne", "authenticate", `NinjaOne OAuth token request failed (${response.status}).`, ninjaRemediation(response.status, "authenticate", "NinjaOne"), {
        vendorStatus: response.status,
        vendorCode: firstString(data.error, data.error_description),
      });
    }
    const token = firstString(data.access_token);
    if (!token) throw new AssetIntegrationError("ninjaOne", "authenticate", "NinjaOne did not return an OAuth access token.", ninjaRemediation(401, "authenticate", "NinjaOne"));
    tokenCache.set(cacheKey, { token, expiresAt: Date.now() + Number(data.expires_in || 3600) * 1000 });
    return token;
  }

  private async api(path: string, init: RequestInit = {}, operation: "create" | "read" | "update" | "delete" | "decommission" | "assign" | "sync" = "read") {
    const bearer = await this.token();
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/ws/v2${path}`, {
        ...init,
        headers: { Authorization: `Bearer ${bearer}`, Accept: "application/json", ...(init.body ? { "Content-Type": "application/json" } : {}), ...init.headers },
        signal: AbortSignal.timeout(30_000),
      });
    } catch {
      throw new AssetIntegrationError("ninjaOne", operation, `Cannot reach ${this.baseUrl}.`, [
        "Verify the NinjaOne Region/base URL matches your tenant (app, us2, us3, eu, ca, or oc).",
        "Confirm outbound HTTPS access and retry the operation.",
      ], { retryable: true });
    }
    const text = await response.text();
    let data: unknown = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
    if (!response.ok) {
      const record = asRecord(data);
      const message = firstString(record.message, record.error_description, record.error, record.resultCode, text) || `NinjaOne request failed (${response.status})`;
      throw new AssetIntegrationError("ninjaOne", operation, message, ninjaRemediation(response.status, operation, "device"), {
        vendorStatus: response.status,
        vendorCode: firstString(record.errorCode, record.code),
        retryable: response.status === 429 || response.status >= 500,
      });
    }
    return data;
  }

  async testConnection(): Promise<IntegrationTestResult> {
    const devices = await this.listDevices("1");
    return { ok: true, provider: "ninjaOne", message: `Connected to NinjaOne. Retrieved ${devices.assets.length} device record(s).`, remoteCount: devices.assets.length };
  }

  async listDevices(cursor = ""): Promise<RemoteAssetPage> {
    const pageSize = cursor === "1" ? 1 : 100;
    const query = new URLSearchParams({ pageSize: String(pageSize) });
    if (cursor && cursor !== "1") query.set("after", cursor);
    const data = await this.api(`/devices-detailed?${query}`, {}, "read");
    const records = Array.isArray(data) ? data as JsonRecord[] : [];
    const assets = records.map(mapDevice).filter((asset) => asset.remoteId);
    return { assets, nextCursor: records.length >= pageSize ? String(records[records.length - 1]?.id || "") : undefined };
  }

  async getDevice(remoteType: AssetRemoteType, remoteId: string): Promise<RemoteAsset> {
    const remote = mapDevice(asRecord(await this.api(`/device/${encodeURIComponent(remoteId)}`, {}, "read")));
    return { ...remote, remoteType };
  }

  private async resolveOwnerUid(email?: string) {
    if (!email) return undefined;
    const users = await this.api(`/users?userType=END_USER`, {}, "read");
    const records = Array.isArray(users) ? users as JsonRecord[] : [];
    const match = records.find((user) => normalizeKey(firstString(user.email)) === normalizeKey(email));
    return firstString(match?.uid);
  }

  async createAsset(asset: AssetPushPayload): Promise<RemoteAsset> {
    const ownerUid = await this.resolveOwnerUid(asset.assignedToEmail);
    if (this.config.createMode === "linkOnly") {
      throw unsupportedOperation("ninjaOne", "create", "NinjaOne devices", [
        "NinjaOne create mode is set to Link Only.",
        "Change Create Mode to Unmanaged ITAM or Staged Device, or link an existing NinjaOne record.",
      ]);
    }
    const path = this.config.createMode === "staged" ? "/staged-device" : "/itam/unmanaged-device";
    const payload = this.config.createMode === "staged"
      ? ninjaStagedPayload(asset, { organizationId: this.config.organizationId, locationId: this.config.locationId, roleId: this.config.unmanagedRoleId, ownerUid })
      : ninjaUnmanagedPayload(asset, { organizationId: this.config.organizationId, locationId: this.config.locationId, roleId: this.config.unmanagedRoleId, ownerUid });
    if (!this.config.organizationId || !this.config.locationId || !this.config.unmanagedRoleId) {
      throw unsupportedOperation("ninjaOne", "create", this.config.createMode === "staged" ? "staged devices" : "unmanaged ITAM devices", [
        "Configure the NinjaOne Organization ID, Location ID, and Device Role ID in Asset Integrations.",
        "Choose an unmanaged device sub-role for ITAM records, or a valid role for staged devices.",
      ]);
    }
    const response = asRecord(await this.api(path, { method: "POST", body: JSON.stringify(payload) }, "create"));
    const remoteId = String(response.nodeId || response.id || "");
    if (!remoteId) throw new AssetIntegrationError("ninjaOne", "create", "NinjaOne accepted the request but did not return a device ID.", ["Refresh NinjaOne remote devices and link the created record manually."]);
    return this.getDevice(this.config.createMode === "staged" ? "ninjaStaged" : "ninjaUnmanaged", remoteId);
  }

  async updateAsset(remoteType: AssetRemoteType, remoteId: string, asset: AssetPushPayload): Promise<RemoteAsset> {
    if (remoteType === "ninjaUnmanaged") {
      const current = await this.getDevice(remoteType, remoteId);
      const payload = ninjaUnmanagedPayload(asset, {
        organizationId: this.config.organizationId || current.organizationId,
        locationId: this.config.locationId || current.locationId,
        roleId: this.config.unmanagedRoleId || current.roleId,
        ownerUid: current.ownerUid,
      });
      await this.api(`/itam/unmanaged-device/${encodeURIComponent(remoteId)}`, { method: "PUT", body: JSON.stringify(payload) }, "update");
      return this.getDevice(remoteType, remoteId);
    }
    const payload = ninjaManagedPayload(asset, { organizationId: this.config.organizationId, locationId: this.config.locationId, roleId: this.config.unmanagedRoleId });
    await this.api(`/device/${encodeURIComponent(remoteId)}`, { method: "PATCH", body: JSON.stringify(payload) }, "update");
    return this.getDevice(remoteType, remoteId);
  }

  async lifecycleAsset(remoteType: AssetRemoteType, remoteId: string, mode: "delete" | "decommission" | "retire") {
    if (remoteType === "ninjaUnmanaged" && mode === "delete") {
      await this.api(`/itam/unmanaged-device/${encodeURIComponent(remoteId)}`, { method: "DELETE" }, "delete");
      return;
    }
    if (remoteType === "ninjaUnmanaged") {
      await this.api(`/itam/unmanaged-device/${encodeURIComponent(remoteId)}/decommission`, { method: "POST", body: "{}" }, "decommission");
      return;
    }
    if (mode === "delete") {
      throw unsupportedOperation("ninjaOne", "delete", "managed devices", [
        "NinjaOne does not expose true deletion for managed devices through the public API.",
        "Use Decommission for the safest lifecycle, or delete an unmanaged ITAM record if the asset is an ITAM object.",
        "If the device remains active, remove or uninstall the NinjaOne agent after decommissioning.",
      ], remoteId);
    }
    await this.api(`/device/${encodeURIComponent(remoteId)}/decommission`, { method: "POST", body: "{}" }, "decommission");
  }

  async assignOwner(remoteType: AssetRemoteType, remoteId: string, member: { email: string; name: string; firebaseUid?: string } | null) {
    if (!member) {
      await this.api(`/device/${encodeURIComponent(remoteId)}/owner`, { method: "DELETE" }, "assign");
      return;
    }
    const ownerUid = await this.resolveOwnerUid(member.email);
    if (!ownerUid) {
      throw new AssetIntegrationError("ninjaOne", "assign", `No enabled NinjaOne end user was found for ${member.email}.`, [
        "Create or invite the Team Member as a NinjaOne end user with the same primary email.",
        "Confirm the end user is enabled, then retry the assignment sync.",
      ], { remoteId });
    }
    await this.api(`/device/${encodeURIComponent(remoteId)}/owner/${encodeURIComponent(ownerUid)}`, { method: "POST", body: "{}" }, "assign");
  }
}
