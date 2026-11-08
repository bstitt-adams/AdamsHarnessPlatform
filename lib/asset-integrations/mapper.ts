import { randomUUID } from "node:crypto";
import type { Timestamp } from "firebase/firestore";
import type { AssetRemoteType, UserAssetDoc } from "@/lib/schema";
import type { AssetPushPayload, RemoteAsset } from "./types";

export function normalizeKey(value?: string | number | null) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function toAssetPushPayload(asset: UserAssetDoc): AssetPushPayload {
  return {
    id: asset.id,
    assetName: asset.assetName,
    assetType: asset.assetType,
    assetTag: asset.assetTag,
    serialNumber: asset.serialNumber,
    identifier: asset.identifier,
    manufacturer: asset.manufacturer,
    model: asset.model,
    status: asset.status,
    condition: asset.condition,
    assignedToTeamMemberId: asset.assignedToTeamMemberId,
    assignedToName: asset.assignedToName,
    assignedToEmail: asset.assignedToEmail,
    assignedToUid: asset.assignedToUid,
    phoneNumber: asset.phoneNumber,
    purchaseDate: asset.purchaseDate,
    purchaseCost: asset.purchaseCost,
    warrantyExpiration: asset.warrantyExpiration,
    notes: asset.notes,
  };
}

function epochSeconds(date?: string) {
  if (!date) return undefined;
  const value = Date.parse(date);
  return Number.isFinite(value) ? Math.floor(value / 1000) : undefined;
}

export function jamfComputerPayload(asset: AssetPushPayload) {
  return {
    udid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(asset.identifier || "") ? asset.identifier : randomUUID(),
    general: {
      name: asset.assetName,
      assetTag: asset.assetTag || "",
      barcode1: asset.id,
      barcode2: asset.identifier || "",
    },
    userAndLocation: {
      realname: asset.assignedToName || "",
      email: asset.assignedToEmail || "",
      phone: asset.phoneNumber || "",
      position: "Team Member",
    },
    hardware: {
      make: asset.manufacturer || "",
      model: asset.model || "",
      serialNumber: asset.serialNumber || "",
    },
    purchasing: {
      purchaseDate: asset.purchaseDate || "",
      purchasePrice: asset.purchaseCost ?? undefined,
      warrantyDate: asset.warrantyExpiration || "",
      vendor: "Adams Electric",
    },
    extensionAttributes: [
      { name: "Adams Asset ID", value: asset.id },
      { name: "Adams Asset Status", value: asset.status || "" },
      { name: "Adams Team Member ID", value: asset.assignedToTeamMemberId || "" },
    ],
  };
}

export function jamfMobilePayload(asset: AssetPushPayload) {
  return {
    name: asset.assetName,
    assetTag: asset.assetTag || "",
    location: {
      realName: asset.assignedToName || "",
      emailAddress: asset.assignedToEmail || "",
      phoneNumber: asset.phoneNumber || "",
    },
    updatedExtensionAttributes: [
      { name: "Adams Asset ID", value: asset.id },
      { name: "Adams Asset Status", value: asset.status || "" },
      { name: "Adams Team Member ID", value: asset.assignedToTeamMemberId || "" },
    ],
  };
}

export function ninjaUnmanagedPayload(asset: AssetPushPayload, options: { organizationId?: number; locationId?: number; roleId?: number; ownerUid?: string }) {
  return {
    name: asset.assetName.slice(0, 200),
    orgId: options.organizationId,
    locationId: options.locationId,
    roleId: options.roleId,
    assignedUserUid: options.ownerUid,
    warrantyStartDate: epochSeconds(asset.purchaseDate),
    warrantyEndDate: epochSeconds(asset.warrantyExpiration),
    assetFields: {
      serialNumber: asset.serialNumber || "",
      assetId: asset.assetTag || asset.identifier || asset.id,
      assetStatus: asset.status || "available",
      assetPurchaseDate: epochSeconds(asset.purchaseDate),
      assetPurchaseAmount: asset.purchaseCost,
      assetExpectedLifetime: "36 months",
    },
  };
}

export function ninjaStagedPayload(asset: AssetPushPayload, options: { organizationId?: number; locationId?: number; roleId?: number; ownerUid?: string }) {
  return {
    name: asset.assetName.slice(0, 200),
    orgId: options.organizationId,
    locationId: options.locationId,
    roleId: options.roleId,
    assignedUserUid: options.ownerUid,
    warrantyStartDate: epochSeconds(asset.purchaseDate),
    warrantyEndDate: epochSeconds(asset.warrantyExpiration),
    itamAssetId: asset.assetTag || asset.identifier || asset.id,
    itamAssetStatus: asset.status || "available",
    itamAssetPurchaseDate: epochSeconds(asset.purchaseDate),
    itamAssetPurchaseAmount: asset.purchaseCost,
    itamAssetSerialNumber: asset.serialNumber || "",
  };
}

export function ninjaManagedPayload(asset: AssetPushPayload, options: { organizationId?: number; locationId?: number; roleId?: number }) {
  return {
    displayName: asset.assetName.slice(0, 200),
    userData: {
      adamsAssetId: asset.id,
      adamsAssetStatus: asset.status || "",
      adamsAssetTag: asset.assetTag || "",
      adamsTeamMemberId: asset.assignedToTeamMemberId || "",
      adamsNotes: asset.notes || "",
    },
    ...(options.organizationId ? { organizationId: options.organizationId } : {}),
    ...(options.locationId ? { locationId: options.locationId } : {}),
    ...(options.roleId ? { nodeRoleId: options.roleId } : {}),
    warranty: {
      startDate: epochSeconds(asset.purchaseDate),
      endDate: epochSeconds(asset.warrantyExpiration),
    },
  };
}

export function remoteAssetTypeName(remoteType: AssetRemoteType) {
  return {
    jamfComputer: "Jamf Computer",
    jamfMobile: "Jamf Mobile Device",
    ninjaManaged: "NinjaOne Managed Device",
    ninjaStaged: "NinjaOne Staged Device",
    ninjaUnmanaged: "NinjaOne Unmanaged Device",
  }[remoteType];
}

export function remoteToAssetFields(remote: RemoteAsset): Partial<UserAssetDoc> {
  const assetType = remote.remoteType === "jamfMobile" || remote.remoteType === "ninjaUnmanaged" && /ios|android|phone/i.test(String(remote.raw.nodeClass || ""))
    ? /ipad|tablet/i.test(remote.displayName) ? "ipad" : "cell phone"
    : /mac|macbook|ios|iphone|ipad/i.test(`${remote.displayName} ${remote.model || ""}`) ? "laptop" : "laptop";
  return {
    assetName: remote.displayName || "Imported device",
    assetType,
    assetTag: remote.assetTag,
    serialNumber: remote.serialNumber,
    identifier: remote.serialNumber || remote.assetTag || remote.remoteId,
    manufacturer: remote.manufacturer,
    model: remote.model,
    phoneNumber: remote.phoneNumber,
    purchaseDate: remote.purchaseDate,
    purchaseCost: remote.purchaseCost,
    warrantyExpiration: remote.warrantyEndDate,
    status: remote.approvalStatus === "DECOMMISSIONED" || remote.status === "decommissioned" ? "retired" : remote.ownerName || remote.ownerEmail ? "active" : "available",
    sourceWorkbook: remote.provider === "jamf" ? "Jamf Pro" : "NinjaOne",
    sourceLabel: remote.remoteId,
    notes: remote.notes,
  };
}

export function timestampValue(value?: Timestamp | Date | null) {
  if (!value) return undefined;
  return value instanceof Date ? value : value.toDate();
}
