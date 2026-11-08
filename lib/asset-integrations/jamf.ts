import type { AssetRemoteType } from "@/lib/schema";
import { AssetIntegrationError, jamfRemediation, unsupportedOperation } from "./errors";
import { jamfComputerPayload, jamfMobilePayload, normalizeKey } from "./mapper";
import type { AssetIntegrationConfig, AssetManagementProviderClient, AssetPushPayload, IntegrationTestResult, RemoteAsset, RemoteAssetPage } from "./types";

type JamfConfig = AssetIntegrationConfig["jamf"];

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

function mapComputer(item: JsonRecord): RemoteAsset {
  const general = asRecord(item.general);
  const hardware = asRecord(item.hardware);
  const user = asRecord(item.userAndLocation);
  const purchasing = asRecord(item.purchasing);
  return {
    provider: "jamf",
    remoteType: "jamfComputer",
    remoteId: String(item.id || general.managementId || ""),
    displayName: firstString(general.name, item.name, hardware.serialNumber) || "Jamf Computer",
    serialNumber: firstString(hardware.serialNumber),
    assetTag: firstString(general.assetTag),
    manufacturer: firstString(hardware.make),
    model: firstString(hardware.model, hardware.modelIdentifier),
    status: general.remoteManagement === true || asRecord(general.remoteManagement).managed === true ? "managed" : "inventory",
    ownerName: firstString(user.realname, user.username),
    ownerEmail: firstString(user.email),
    phoneNumber: firstString(user.phone),
    purchaseDate: firstString(purchasing.purchaseDate),
    purchaseCost: firstNumber(purchasing.purchasePrice),
    warrantyEndDate: firstString(purchasing.warrantyDate, purchasing.warrantyExpires),
    raw: item,
  };
}

function mapMobile(item: JsonRecord): RemoteAsset {
  const general = asRecord(item.general);
  const hardware = asRecord(item.hardware);
  const location = asRecord(item.location);
  return {
    provider: "jamf",
    remoteType: "jamfMobile",
    remoteId: String(item.mobileDeviceId || item.id || general.mobileDeviceId || ""),
    displayName: firstString(item.displayName, general.displayName, general.name, item.name) || "Jamf Mobile Device",
    serialNumber: firstString(item.serialNumber, general.serialNumber, hardware.serialNumber),
    assetTag: firstString(item.assetTag, general.assetTag),
    manufacturer: firstString(hardware.make, "Apple"),
    model: firstString(item.model, hardware.model, general.model),
    status: firstString(item.status, general.status) || "managed",
    ownerName: firstString(item.realName, location.realName, location.username),
    ownerEmail: firstString(item.emailAddress, location.emailAddress),
    phoneNumber: firstString(item.devicePhoneNumber, item.phoneNumber, location.phoneNumber),
    raw: item,
  };
}

export class JamfClient implements AssetManagementProviderClient {
  provider = "jamf" as const;
  constructor(private config: JamfConfig) {}

  private get baseUrl() {
    return this.config.baseUrl.replace(/\/+$/, "");
  }

  private async token() {
    if (!this.baseUrl || !this.config.clientId || !this.config.clientSecret) {
      throw new AssetIntegrationError("jamf", "authenticate", "Jamf OAuth configuration is incomplete.", jamfRemediation(401, "authenticate", "Jamf Pro"));
    }
    const cacheKey = `${this.baseUrl}:${this.config.clientId}`;
    const cached = tokenCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now() + 30_000) return cached.token;

    const requestToken = async (path: string) => {
      let response: Response;
      try {
        response = await fetch(`${this.baseUrl}${path}`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
          body: new URLSearchParams({ grant_type: "client_credentials", client_id: this.config.clientId, client_secret: this.config.clientSecret }),
          signal: AbortSignal.timeout(15_000),
        });
      } catch {
        throw new AssetIntegrationError("jamf", "authenticate", `Cannot reach ${this.baseUrl}.`, [
          "Set Jamf Tenant URL to your real Jamf Cloud host, e.g. https://yourcompany.jamfcloud.com.",
          "Confirm the tenant is reachable and Adams Platform has outbound HTTPS access, then rerun Test.",
        ]);
      }
      const text = await response.text();
      let data: JsonRecord = {};
      try { data = asRecord(JSON.parse(text)); } catch { data = { error: text }; }
      return { response, data };
    };
    let { response, data } = await requestToken("/api/v1/oauth/token");
    if (response.status === 404 || response.status === 405) ({ response, data } = await requestToken("/api/oauth/token"));
    if (!response.ok) {
      throw new AssetIntegrationError("jamf", "authenticate", `Jamf OAuth token request failed (${response.status}).`, jamfRemediation(response.status, "authenticate", "Jamf Pro"), {
        vendorStatus: response.status,
        vendorCode: firstString(data.error, data.error_description),
      });
    }
    const token = firstString(data.access_token);
    if (!token) throw new AssetIntegrationError("jamf", "authenticate", "Jamf did not return an OAuth access token.", jamfRemediation(401, "authenticate", "Jamf Pro"));
    tokenCache.set(cacheKey, { token, expiresAt: Date.now() + Number(data.expires_in || 300) * 1000 });
    return token;
  }

  private async api(path: string, init: RequestInit = {}, operation: "create" | "read" | "update" | "delete" | "decommission" | "assign" | "sync" = "read") {
    const bearer = await this.token();
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        headers: { Authorization: `Bearer ${bearer}`, Accept: "application/json", ...(init.body ? { "Content-Type": "application/json" } : {}), ...init.headers },
        signal: AbortSignal.timeout(30_000),
      });
    } catch {
      throw new AssetIntegrationError("jamf", operation, `Cannot reach ${this.baseUrl}.`, [
        "Verify the Jamf Tenant URL matches your Jamf Cloud host and the service is reachable.",
        "Confirm outbound HTTPS access, then retry the operation.",
      ], { retryable: true });
    }
    const text = await response.text();
    let data: unknown = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
    if (!response.ok) {
      const record = asRecord(data);
      const message = firstString(record.message, record.error_description, record.error, text) || `Jamf request failed (${response.status})`;
      throw new AssetIntegrationError("jamf", operation, message, jamfRemediation(response.status, operation, "device inventory"), {
        vendorStatus: response.status,
        vendorCode: firstString(record.errorCode, record.code),
        retryable: response.status === 429 || response.status >= 500,
      });
    }
    return data;
  }

  async testConnection(): Promise<IntegrationTestResult> {
    const computers = await this.listDevices("computer:0");
    return { ok: true, provider: "jamf", message: `Connected to Jamf Pro. Retrieved ${computers.assets.length} computer record(s).`, remoteCount: computers.assets.length };
  }

  async listDevices(cursor = ""): Promise<RemoteAssetPage> {
    const [kind = "all", page = "0"] = cursor.split(":");
    const pageNumber = Number(page || 0);
    const assets: RemoteAsset[] = [];
    if ((kind === "all" || kind === "computer") && this.config.syncComputers) {
      const data = asRecord(await this.api(`/api/v4/computers-inventory?section=GENERAL&section=HARDWARE&section=USER_AND_LOCATION&section=PURCHASING&page=${pageNumber}&page-size=${kind === "computer" && pageNumber === 0 ? 1 : 100}`, {}, "read"));
      const results = Array.isArray(data.results) ? data.results as JsonRecord[] : [];
      assets.push(...results.map(mapComputer).filter((asset) => asset.remoteId));
      if (kind === "computer" && results.length >= 100) return { assets, nextCursor: `computer:${pageNumber + 1}` };
      if (kind === "all" && results.length >= 100) return { assets, nextCursor: `all:${pageNumber + 1}` };
    }
    if ((kind === "all" || kind === "allMobile" || kind === "mobile") && this.config.syncMobileDevices) {
      const mobilePage = kind === "mobile" || kind === "allMobile" ? pageNumber : 0;
      const data = asRecord(await this.api(`/api/v2/mobile-devices/detail?section=GENERAL&section=HARDWARE&section=LOCATION&page=${mobilePage}&page-size=${kind === "mobile" && mobilePage === 0 ? 1 : 100}&exception-handling=LENIENT`, {}, "read"));
      const results = Array.isArray(data.results) ? data.results as JsonRecord[] : [];
      assets.push(...results.map(mapMobile).filter((asset) => asset.remoteId));
      if ((kind === "mobile" || kind === "allMobile" || kind === "all") && results.length >= 100) return { assets, nextCursor: `${kind === "mobile" ? "mobile" : "allMobile"}:${mobilePage + 1}` };
    }
    return { assets };
  }

  async getDevice(remoteType: AssetRemoteType, remoteId: string): Promise<RemoteAsset> {
    if (remoteType === "jamfComputer") return mapComputer(asRecord(await this.api(`/api/v4/computers-inventory/${encodeURIComponent(remoteId)}?section=GENERAL&section=HARDWARE&section=USER_AND_LOCATION&section=PURCHASING`, {}, "read")));
    if (remoteType === "jamfMobile") return mapMobile(asRecord(await this.api(`/api/v2/mobile-devices/${encodeURIComponent(remoteId)}`, {}, "read")));
    throw unsupportedOperation("jamf", "read", remoteType, ["Choose a Jamf computer or Jamf mobile device record."], remoteId);
  }

  async createAsset(asset: AssetPushPayload): Promise<RemoteAsset> {
    if (!this.config.syncComputers) {
      throw unsupportedOperation("jamf", "create", "Jamf computer inventory", ["Enable Jamf computer sync or link an existing Jamf mobile record manually."]);
    }
    const response = await this.api(`/api/v4/computers-inventory`, { method: "POST", body: JSON.stringify(jamfComputerPayload(asset)) }, "create");
    const remote = mapComputer(asRecord(response));
    if (!remote.remoteId) throw new AssetIntegrationError("jamf", "create", "Jamf accepted the request but did not return a computer ID.", ["Refresh remote devices and link the created Jamf computer manually."]);
    return remote;
  }

  async updateAsset(remoteType: AssetRemoteType, remoteId: string, asset: AssetPushPayload): Promise<RemoteAsset> {
    if (remoteType === "jamfComputer") {
      await this.api(`/api/v4/computers-inventory-detail/${encodeURIComponent(remoteId)}`, { method: "PATCH", body: JSON.stringify(jamfComputerPayload(asset)) }, "update");
      return this.getDevice(remoteType, remoteId);
    }
    if (remoteType === "jamfMobile") {
      await this.api(`/api/v2/mobile-devices/${encodeURIComponent(remoteId)}`, { method: "PATCH", body: JSON.stringify(jamfMobilePayload(asset)) }, "update");
      return this.getDevice(remoteType, remoteId);
    }
    throw unsupportedOperation("jamf", "update", remoteType, ["Choose a Jamf computer or Jamf mobile device record."], remoteId);
  }

  async lifecycleAsset(remoteType: AssetRemoteType, remoteId: string, mode: "delete" | "decommission" | "retire") {
    if (remoteType === "jamfComputer") {
      await this.api(`/api/v4/computers-inventory/${encodeURIComponent(remoteId)}`, { method: "DELETE" }, mode === "delete" ? "delete" : "decommission");
      return;
    }
    if (remoteType === "jamfMobile") {
      throw unsupportedOperation("jamf", mode === "delete" ? "delete" : "decommission", "Jamf mobile devices", [
        "Jamf Pro's current mobile-device API supports reading and updating mobile records but does not expose a current create/delete endpoint for this workflow.",
        "Use Jamf enrollment, Apple Business Manager, or Inventory Preload for lifecycle management, then link the discovered record.",
        "If a tenant-approved legacy Classic API workflow is required, enable it explicitly and grant the legacy mobile device privileges; otherwise unlink or retire the Adams asset.",
      ], remoteId);
    }
    throw unsupportedOperation("jamf", mode, remoteType, ["Jamf supports true delete only for computer inventory records in this integration."], remoteId);
  }

  async assignOwner(remoteType: AssetRemoteType, remoteId: string, member: { email: string; name: string; firebaseUid?: string } | null) {
    if (remoteType === "jamfComputer") {
      await this.api(`/api/v4/computers-inventory-detail/${encodeURIComponent(remoteId)}`, {
        method: "PATCH",
        body: JSON.stringify({ userAndLocation: { realname: member?.name || "", email: member?.email || "" } }),
      }, "assign");
      return;
    }
    if (remoteType === "jamfMobile") {
      await this.api(`/api/v2/mobile-devices/${encodeURIComponent(remoteId)}`, {
        method: "PATCH",
        body: JSON.stringify({ location: { realName: member?.name || "", emailAddress: member?.email || "" } }),
      }, "assign");
      return;
    }
    throw unsupportedOperation("jamf", "assign", remoteType, ["Choose a Jamf computer or Jamf mobile device record."], remoteId);
  }
}
