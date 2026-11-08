import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Timestamp } from "firebase-admin/firestore";
import { authErrorResponse, requireAdmin } from "@/lib/auth/server-auth";
import { adminDb } from "@/lib/firebase-admin";
import { COLLECTIONS, type TeamMemberDoc, type UserAssetDoc } from "@/lib/schema";
import { resolveAssetIntegrationConfig } from "@/lib/asset-integrations/config";
import { getAssetLinks, lifecycleAssetOnProvider, pushAssetToProvider } from "@/lib/asset-integrations/sync";

const updateSchema = z.object({
  assetTag: z.string().trim().max(200).optional(),
  assetType: z.string().trim().max(100).optional(),
  assetName: z.string().trim().min(1).max(300).optional(),
  manufacturer: z.string().trim().max(200).optional(),
  model: z.string().trim().max(200).optional(),
  serialNumber: z.string().trim().max(200).optional(),
  identifier: z.string().trim().max(200).optional(),
  status: z.enum(["available", "active", "maintenance", "returned", "retired", "lost"]).optional(),
  condition: z.enum(["new", "good", "fair", "damaged"]).optional(),
  assignedToTeamMemberId: z.string().trim().nullable().optional(),
  phoneNumber: z.string().trim().max(100).optional(),
  carrier: z.string().trim().max(200).optional(),
  plan: z.string().trim().max(200).optional(),
  imei: z.string().trim().max(100).optional(),
  purchaseDate: z.string().trim().max(50).optional(),
  purchaseCost: z.coerce.number().optional(),
  warrantyExpiration: z.string().trim().max(50).optional(),
  nextInspectionDate: z.string().trim().max(50).optional(),
  notes: z.string().trim().max(10000).optional(),
  syncProviders: z.boolean().optional().default(true),
});

const deleteSchema = z.object({ mode: z.enum(["delete", "retire", "unlink"]).default("retire") });

function clean<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as T;
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request);
    if (!adminDb) return NextResponse.json({ error: "Firebase Admin is not configured" }, { status: 503 });
    const { id } = await context.params;
    const [assetSnap, linksSnap] = await Promise.all([
      adminDb.collection(COLLECTIONS.USER_ASSETS).doc(id).get(),
      adminDb.collection(COLLECTIONS.ASSET_EXTERNAL_LINKS).where("assetId", "==", id).get(),
    ]);
    if (!assetSnap.exists) return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    return NextResponse.json({ ok: true, asset: { id: assetSnap.id, ...assetSnap.data() }, links: linksSnap.docs.map((item) => ({ id: item.id, ...item.data() })) });
  } catch (error) {
    const authError = authErrorResponse(error);
    if (authError) return authError;
    console.error("Asset read error:", error);
    return NextResponse.json({ error: "Unable to load asset" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireAdmin(request);
    if (!adminDb) return NextResponse.json({ error: "Firebase Admin is not configured" }, { status: 503 });
    const { id } = await context.params;
    const parsed = updateSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid asset update", issues: parsed.error.issues }, { status: 400 });
    const ref = adminDb.collection(COLLECTIONS.USER_ASSETS).doc(id);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    const current = { id: snap.id, ...snap.data() } as UserAssetDoc;
    const input = parsed.data;
    const assignmentChanged = input.assignedToTeamMemberId !== undefined && (input.assignedToTeamMemberId || "") !== (current.assignedToTeamMemberId || "");
    let member: TeamMemberDoc | null = null;
    if (assignmentChanged && input.assignedToTeamMemberId) {
      const memberSnap = await adminDb.collection(COLLECTIONS.TEAM_MEMBERS).doc(input.assignedToTeamMemberId).get();
      if (!memberSnap.exists) return NextResponse.json({ error: "Team Member not found" }, { status: 404 });
      member = { id: memberSnap.id, ...memberSnap.data() } as TeamMemberDoc;
    }
    const now = Timestamp.now();
    const previousName = current.assignedToName || "Unassigned";
    const assignedToName = member ? `${member.firstName} ${member.lastName}`.trim() : "Unassigned";
    const action = member ? (current.assignedToTeamMemberId && current.assignedToTeamMemberId !== member.id ? "reassigned" : "assigned") : "unassigned";
    const update = clean({
      ...input,
      syncProviders: undefined,
      identifier: input.identifier || input.serialNumber || input.assetTag || current.identifier,
      ...(assignmentChanged ? {
        assignedToTeamMemberId: member?.id || "",
        assignedToName,
        assignedToEmail: member?.emailPrimary || "",
        assignedToUid: member?.firebaseUid || "",
        assignmentMatchStatus: member ? "matched" : "not_applicable",
        assignmentReturnedAt: member ? null : now,
        status: member ? (current.status === "available" || current.status === "returned" ? "active" : (input.status || current.status)) : "available",
        lastAssignmentAction: action,
        lastReassignedAt: now,
        lastReassignedByUid: actor.uid,
        lastReassignedByName: actor.email,
        lastReassignedFromTeamMemberId: current.assignedToTeamMemberId || "",
        lastReassignedFromTeamMemberName: previousName,
        lastReassignedToTeamMemberId: member?.id || "",
        lastReassignedToTeamMemberName: assignedToName,
      } : {}),
      updatedAt: now,
    });
    await ref.set(update, { merge: true });
    if (assignmentChanged) {
      await adminDb.collection(COLLECTIONS.ASSET_HISTORY).add({
        assetId: id,
        action,
        teamMemberId: member?.id || "",
        teamMemberName: assignedToName,
        fromTeamMemberId: current.assignedToTeamMemberId || "",
        fromTeamMemberName: previousName,
        toTeamMemberId: member?.id || "",
        toTeamMemberName: assignedToName,
        reassignedByUid: actor.uid,
        reassignedByName: actor.email,
        performedByUid: actor.uid,
        performedByName: actor.email,
        createdAt: now,
      });
    }
    const updatedAsset = { ...current, ...update } as unknown as UserAssetDoc;
    const providerResults = [];
    if (input.syncProviders) {
      const config = await resolveAssetIntegrationConfig();
      const links = await getAssetLinks(id);
      for (const link of links) {
        if (link.status !== "deleted" && link.status !== "decommissioned") {
          providerResults.push({ provider: link.provider, ...(await pushAssetToProvider(updatedAsset, link.provider, config, { uid: actor.uid, name: actor.email }, false)) });
        }
      }
    }
    return NextResponse.json({ ok: true, asset: updatedAsset, providerResults });
  } catch (error) {
    const authError = authErrorResponse(error);
    if (authError) return authError;
    console.error("Asset update error:", error);
    return NextResponse.json({ error: "Unable to update asset" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireAdmin(request);
    if (!adminDb) return NextResponse.json({ error: "Firebase Admin is not configured" }, { status: 503 });
    const { id } = await context.params;
    const parsed = deleteSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ error: "Invalid asset lifecycle request" }, { status: 400 });
    const ref = adminDb.collection(COLLECTIONS.USER_ASSETS).doc(id);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    const asset = { id: snap.id, ...snap.data() } as UserAssetDoc;
    const links = await getAssetLinks(id);
    const config = await resolveAssetIntegrationConfig();
    const providerResults = [];
    if (parsed.data.mode !== "unlink") {
      for (const link of links.filter((item) => item.status !== "deleted" && item.status !== "decommissioned")) {
        providerResults.push({ provider: link.provider, ...(await lifecycleAssetOnProvider(asset, link, parsed.data.mode === "delete" ? "delete" : "decommission", config, { uid: actor.uid, name: actor.email })) });
      }
      const failures = providerResults.filter((item) => item.status === "failed");
      if (failures.length) {
        return NextResponse.json({ ok: false, error: "One or more remote asset lifecycle operations failed.", providerResults }, { status: 502 });
      }
    }
    const now = Timestamp.now();
    const db = adminDb;
    if (parsed.data.mode === "delete") {
      await ref.delete();
      await Promise.all(links.map((link) => db.collection(COLLECTIONS.ASSET_EXTERNAL_LINKS).doc(link.id).delete()));
    } else {
      await ref.set({ status: "retired", assignmentReturnedAt: now, updatedAt: now }, { merge: true });
      if (parsed.data.mode === "unlink") {
        await Promise.all(links.map((link) => db.collection(COLLECTIONS.ASSET_EXTERNAL_LINKS).doc(link.id).set({ status: "manual_required", updatedAt: now }, { merge: true })));
      }
    }
    await adminDb.collection(COLLECTIONS.ASSET_HISTORY).add({
      assetId: id,
      action: parsed.data.mode === "delete" ? "deleted" : parsed.data.mode === "unlink" ? "unlinked" : "retired",
      performedByUid: actor.uid,
      performedByName: actor.email,
      metadata: { providerResults: providerResults.length },
      createdAt: now,
    });
    return NextResponse.json({ ok: true, mode: parsed.data.mode, providerResults });
  } catch (error) {
    const authError = authErrorResponse(error);
    if (authError) return authError;
    console.error("Asset lifecycle error:", error);
    return NextResponse.json({ error: "Unable to update asset lifecycle" }, { status: 500 });
  }
}
