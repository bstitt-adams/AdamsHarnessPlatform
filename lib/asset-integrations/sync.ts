import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import {
  COLLECTIONS,
  type AssetExternalLinkDoc,
  type AssetExternalSystemSummary,
  type AssetProvider,
  type AssetSyncRunDoc,
  type TeamMemberDoc,
  type UserAssetDoc,
} from "@/lib/schema";
import { errorPayload } from "./errors";
import { normalizeKey, remoteToAssetFields, toAssetPushPayload } from "./mapper";
import { getProviderClient, providerCapabilities, providerLabel } from "./providers";
import type { AssetIntegrationConfig, AssetSyncOutcome, RemoteAsset } from "./types";

export interface AssetSyncActor {
  uid: string;
  name: string;
}

function clean<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as T;
}

function linkId(assetId: string, provider: AssetProvider, remoteId: string) {
  return `${assetId}_${provider}_${remoteId}`.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function remoteSummary(remote: RemoteAsset, status: AssetExternalLinkDoc["status"], result?: AssetExternalLinkDoc["lastSyncResult"], error?: string): AssetExternalSystemSummary {
  return clean({
    provider: remote.provider,
    remoteType: remote.remoteType,
    remoteId: remote.remoteId,
    remoteName: remote.displayName,
    status,
    lastSyncAt: Timestamp.now() as unknown as never,
    lastSyncResult: result,
    lastSyncError: error,
  });
}

async function writeLink(assetId: string, remote: RemoteAsset, actor: AssetSyncActor, status: AssetExternalLinkDoc["status"], direction: "inbound" | "outbound", result: AssetExternalLinkDoc["lastSyncResult"], error?: string, remediation?: string[]) {
  if (!adminDb) throw new Error("Firebase Admin is not configured");
  const now = Timestamp.now();
  const id = linkId(assetId, remote.provider, remote.remoteId);
  const capabilities = Object.assign({}, ...providerCapabilities(remote.provider).filter((item) => item.remoteType === remote.remoteType).map((item) => item.capabilities));
  const link: AssetExternalLinkDoc = clean({
    id,
    assetId,
    provider: remote.provider,
    remoteType: remote.remoteType,
    remoteId: remote.remoteId,
    remoteName: remote.displayName,
    remoteSerial: remote.serialNumber,
    remoteAssetTag: remote.assetTag,
    remoteOwnerUid: remote.ownerUid,
    remoteUrl: remote.remoteUrl,
    status,
    syncDirection: "bidirectional",
    capabilities,
    remoteSnapshot: clean({
      displayName: remote.displayName || null,
      serialNumber: remote.serialNumber || null,
      assetTag: remote.assetTag || null,
      status: remote.status || null,
      approvalStatus: remote.approvalStatus || null,
      ownerEmail: remote.ownerEmail || null,
      organizationId: remote.organizationId || null,
      locationId: remote.locationId || null,
    }),
    lastSyncAt: now,
    lastSyncDirection: direction,
    lastSyncResult: result,
    lastSyncError: error,
    remediation,
    createdByUid: actor.uid,
    createdByName: actor.name,
    createdAt: now,
    updatedAt: now,
  }) as unknown as AssetExternalLinkDoc;
  await adminDb.collection(COLLECTIONS.ASSET_EXTERNAL_LINKS).doc(id).set(link, { merge: true });
  const assetRef = adminDb.collection(COLLECTIONS.USER_ASSETS).doc(assetId);
  const assetSnap = await assetRef.get();
  const existing = (assetSnap.data()?.externalSystems || []) as AssetExternalSystemSummary[];
  const summary = remoteSummary(remote, status, result, error);
  await assetRef.set({
    externalSystems: [...existing.filter((item) => !(item.provider === remote.provider && item.remoteId === remote.remoteId)), summary],
    updatedAt: now,
  }, { merge: true });
  return link;
}

export async function getAssetLinks(assetId: string) {
  if (!adminDb) return [] as AssetExternalLinkDoc[];
  const snap = await adminDb.collection(COLLECTIONS.ASSET_EXTERNAL_LINKS).where("assetId", "==", assetId).get();
  return snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }) as AssetExternalLinkDoc);
}

export async function getTeamMemberForAsset(asset: UserAssetDoc) {
  if (!adminDb || !asset.assignedToTeamMemberId) return null;
  const snap = await adminDb.collection(COLLECTIONS.TEAM_MEMBERS).doc(asset.assignedToTeamMemberId).get();
  return snap.exists ? ({ id: snap.id, ...snap.data() } as TeamMemberDoc) : null;
}

async function listRemoteAssets(provider: AssetProvider, config: AssetIntegrationConfig, maxPages = 10) {
  const client = getProviderClient(provider, config);
  const assets: RemoteAsset[] = [];
  let cursor = "";
  for (let page = 0; page < maxPages; page++) {
    const result = await client.listDevices(cursor);
    assets.push(...result.assets);
    if (!result.nextCursor) break;
    cursor = result.nextCursor;
  }
  return assets;
}

function remoteMatchesAsset(remote: RemoteAsset, asset: UserAssetDoc) {
  const localKeys = new Set([asset.assetTag, asset.serialNumber, asset.identifier].map(normalizeKey).filter(Boolean));
  return [remote.assetTag, remote.serialNumber].map(normalizeKey).some((key) => key && localKeys.has(key));
}

function remoteMatchesLocal(remote: RemoteAsset, assets: UserAssetDoc[]) {
  const remoteKeys = new Set([remote.assetTag, remote.serialNumber, remote.remoteId].map(normalizeKey).filter(Boolean));
  return assets.find((asset) => [asset.assetTag, asset.serialNumber, asset.identifier, asset.sourceLabel].map(normalizeKey).some((key) => key && remoteKeys.has(key)));
}

export async function pushAssetToProvider(asset: UserAssetDoc, provider: AssetProvider, config: AssetIntegrationConfig, actor: AssetSyncActor, autoCreate = true): Promise<AssetSyncOutcome> {
  if (!adminDb) return { status: "failed", message: "Firebase Admin is not configured" };
  const client = getProviderClient(provider, config);
  const payload = toAssetPushPayload(asset);
  try {
    const links = (await getAssetLinks(asset.id)).filter((item) => item.provider === provider);
    const member = await getTeamMemberForAsset(asset);
    let remote: RemoteAsset;
    if (links[0]) {
      remote = await client.updateAsset(links[0].remoteType, links[0].remoteId, payload);
      await client.assignOwner(remote.remoteType, remote.remoteId, member ? { email: member.emailPrimary, name: `${member.firstName} ${member.lastName}`.trim(), firebaseUid: member.firebaseUid } : null);
    } else {
      if (!autoCreate) return { status: "skipped", message: `No ${providerLabel(provider)} remote record is linked to this asset.` };
      const remotes = await listRemoteAssets(provider, config, 3);
      const existing = remotes.find((item) => remoteMatchesAsset(item, asset));
      remote = existing || await client.createAsset(payload);
      await writeLink(asset.id, remote, actor, "linked", "outbound", "success");
      if (member) await client.assignOwner(remote.remoteType, remote.remoteId, { email: member.emailPrimary, name: `${member.firstName} ${member.lastName}`.trim(), firebaseUid: member.firebaseUid });
    }
    await writeLink(asset.id, remote, actor, "synced", "outbound", "success");
    return { status: "success", remote, message: `${providerLabel(provider)} synchronized ${remote.displayName}` };
  } catch (error) {
    const payloadError = errorPayload(error, provider, "sync");
    return { status: "failed", message: payloadError.error, remediation: payloadError.remediation };
  }
}

export async function linkRemoteAsset(asset: UserAssetDoc, remote: RemoteAsset, actor: AssetSyncActor) {
  await writeLink(asset.id, remote, actor, "linked", "inbound", "success");
  return { status: "success", remote, message: `${providerLabel(remote.provider)} linked ${remote.displayName}` } satisfies AssetSyncOutcome;
}

export async function pullAssetFromProvider(asset: UserAssetDoc, link: AssetExternalLinkDoc, config: AssetIntegrationConfig, actor: AssetSyncActor) {
  if (!adminDb) return { status: "failed", message: "Firebase Admin is not configured" } satisfies AssetSyncOutcome;
  const client = getProviderClient(link.provider, config);
  try {
    const remote = await client.getDevice(link.remoteType, link.remoteId);
    await adminDb.collection(COLLECTIONS.USER_ASSETS).doc(asset.id).set(remoteToAssetFields(remote), { merge: true });
    await writeLink(asset.id, remote, actor, "synced", "inbound", "success");
    return { status: "success", remote, message: `${providerLabel(link.provider)} refreshed ${remote.displayName}` } satisfies AssetSyncOutcome;
  } catch (error) {
    const payloadError = errorPayload(error, link.provider, "sync");
    const remote: RemoteAsset = { provider: link.provider, remoteType: link.remoteType, remoteId: link.remoteId, displayName: link.remoteName || "Missing remote record", raw: {} };
    await writeLink(asset.id, remote, actor, "error", "inbound", "failed", payloadError.error, payloadError.remediation);
    return { status: "failed", message: payloadError.error, remediation: payloadError.remediation } satisfies AssetSyncOutcome;
  }
}

export async function lifecycleAssetOnProvider(asset: UserAssetDoc, link: AssetExternalLinkDoc, mode: "delete" | "decommission" | "retire", config: AssetIntegrationConfig, actor: AssetSyncActor) {
  const client = getProviderClient(link.provider, config);
  try {
    await client.lifecycleAsset(link.remoteType, link.remoteId, mode);
    const remote: RemoteAsset = { provider: link.provider, remoteType: link.remoteType, remoteId: link.remoteId, displayName: link.remoteName || asset.assetName, raw: {} };
    await writeLink(asset.id, remote, actor, mode === "delete" ? "deleted" : "decommissioned", "outbound", "success");
    return { status: "success", message: `${providerLabel(link.provider)} ${mode === "delete" ? "deleted" : "decommissioned"} ${link.remoteName || link.remoteId}` } satisfies AssetSyncOutcome;
  } catch (error) {
    const payloadError = errorPayload(error, link.provider, mode === "delete" ? "delete" : "decommission");
    return { status: "failed", message: payloadError.error, remediation: payloadError.remediation } satisfies AssetSyncOutcome;
  }
}

export async function runInboundSync(provider: AssetProvider, config: AssetIntegrationConfig, actor: AssetSyncActor) {
  if (!adminDb) throw new Error("Firebase Admin is not configured");
  const startedAt = Timestamp.now();
  const runRef = adminDb.collection(COLLECTIONS.ASSET_SYNC_RUNS).doc();
  const results: NonNullable<AssetSyncRunDoc["results"]> = [];
  try {
    const [remotes, assetsSnap, membersSnap] = await Promise.all([
      listRemoteAssets(provider, config, 10),
      adminDb.collection(COLLECTIONS.USER_ASSETS).get(),
      adminDb.collection(COLLECTIONS.TEAM_MEMBERS).get(),
    ]);
    const assets = assetsSnap.docs.map((item) => ({ id: item.id, ...item.data() }) as UserAssetDoc);
    const members = membersSnap.docs.map((item) => ({ id: item.id, ...item.data() }) as TeamMemberDoc);
    let matched = 0, created = 0, updated = 0, skipped = 0;
    for (const remote of remotes) {
      const local = remoteMatchesLocal(remote, assets);
      const member = remote.ownerEmail ? members.find((item) => normalizeKey(item.emailPrimary) === normalizeKey(remote.ownerEmail)) : undefined;
      if (!local) {
        const shouldImport = provider === "jamf" ? config.jamf.importUnmatched : config.ninjaOne.importUnmatched;
        if (!shouldImport) {
          skipped++;
          results.push({ remoteId: remote.remoteId, status: "skipped", message: "No local asset matched; unmatched import is disabled." });
          continue;
        }
        const assetRef = adminDb.collection(COLLECTIONS.USER_ASSETS).doc();
        const now = Timestamp.now();
        await assetRef.set(clean({
          ...remoteToAssetFields(remote),
          id: assetRef.id,
          assignedToTeamMemberId: member?.id || "",
          assignedToName: member ? `${member.firstName} ${member.lastName}`.trim() : "Unassigned",
          assignedToEmail: member?.emailPrimary || remote.ownerEmail || "",
          assignedToUid: member?.firebaseUid || "",
          assignmentMatchStatus: member ? "matched" : "unmatched",
          assignedByUid: actor.uid,
          assignedByName: actor.name,
          assignedAt: now,
          createdAt: now,
          updatedAt: now,
        }));
        const localAsset = { id: assetRef.id, ...remoteToAssetFields(remote) } as UserAssetDoc;
        await writeLink(assetRef.id, remote, actor, "synced", "inbound", "success");
        assets.push(localAsset);
        created++;
        matched++;
        results.push({ assetId: assetRef.id, remoteId: remote.remoteId, status: "success", message: "Imported and linked remote asset." });
        continue;
      }
      await adminDb.collection(COLLECTIONS.USER_ASSETS).doc(local.id).set(clean({
        ...remoteToAssetFields(remote),
        ...(member && !local.assignedToTeamMemberId ? {
          assignedToTeamMemberId: member.id,
          assignedToName: `${member.firstName} ${member.lastName}`.trim(),
          assignedToEmail: member.emailPrimary,
          assignedToUid: member.firebaseUid,
          assignmentMatchStatus: "matched",
        } : {}),
        updatedAt: Timestamp.now(),
      }), { merge: true });
      await writeLink(local.id, remote, actor, "synced", "inbound", "success");
      matched++;
      updated++;
      results.push({ assetId: local.id, remoteId: remote.remoteId, status: "success", message: "Remote record reconciled." });
    }
    const status = results.some((item) => item.status === "failed") ? "partial" : "success";
    const run: AssetSyncRunDoc = clean({
      id: runRef.id,
      provider,
      operation: "inbound",
      direction: "inbound",
      status,
      totalRemoteRecords: remotes.length,
      matchedAssets: matched,
      createdAssets: created,
      updatedAssets: updated,
      linkedAssets: matched,
      skippedRecords: skipped,
      failedRecords: results.filter((item) => item.status === "failed").length,
      results: results.slice(0, 200),
      actorUid: actor.uid,
      actorName: actor.name,
      startedAt,
      completedAt: Timestamp.now(),
      createdAt: startedAt,
    }) as unknown as AssetSyncRunDoc;
    await runRef.set(run);
    return { provider, status, totalRemoteRecords: remotes.length, matchedAssets: matched, createdAssets: created, updatedAssets: updated, skippedRecords: skipped, results: results.slice(0, 100) };
  } catch (error) {
    const payload = errorPayload(error, provider, "sync");
    await runRef.set(clean({
      id: runRef.id,
      provider,
      operation: "inbound",
      direction: "inbound",
      status: "failed",
      results: [{ status: "failed", message: payload.error, remediation: payload.remediation }],
      remediation: payload.remediation,
      actorUid: actor.uid,
      actorName: actor.name,
      startedAt,
      completedAt: Timestamp.now(),
      createdAt: startedAt,
    }));
    throw error;
  }
}
