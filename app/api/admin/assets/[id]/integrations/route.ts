import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authErrorResponse, requireAdmin } from "@/lib/auth/server-auth";
import { adminDb } from "@/lib/firebase-admin";
import { COLLECTIONS, type UserAssetDoc } from "@/lib/schema";
import { resolveAssetIntegrationConfig } from "@/lib/asset-integrations/config";
import { errorPayload } from "@/lib/asset-integrations/errors";
import { getProviderClient } from "@/lib/asset-integrations/providers";
import { getAssetLinks, linkRemoteAsset } from "@/lib/asset-integrations/sync";

const linkSchema = z.object({
  provider: z.enum(["jamf", "ninjaOne"]),
  remoteType: z.enum(["jamfComputer", "jamfMobile", "ninjaManaged", "ninjaStaged", "ninjaUnmanaged"]),
  remoteId: z.string().trim().min(1).max(300),
});

const unlinkSchema = z.object({ provider: z.enum(["jamf", "ninjaOne"]).optional() });

async function loadAsset(id: string) {
  if (!adminDb) return null;
  const snap = await adminDb.collection(COLLECTIONS.USER_ASSETS).doc(id).get();
  return snap.exists ? ({ id: snap.id, ...snap.data() } as UserAssetDoc) : null;
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  let provider: "jamf" | "ninjaOne" = "jamf";
  try {
    const actor = await requireAdmin(request);
    const { id } = await context.params;
    const parsed = linkSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid remote link request" }, { status: 400 });
    provider = parsed.data.provider;
    const asset = await loadAsset(id);
    if (!asset) return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    const config = await resolveAssetIntegrationConfig();
    const client = getProviderClient(parsed.data.provider, config);
    const remote = await client.getDevice(parsed.data.remoteType, parsed.data.remoteId);
    const result = await linkRemoteAsset(asset, remote, { uid: actor.uid, name: actor.email });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const authError = authErrorResponse(error);
    if (authError) return authError;
    const payload = errorPayload(error, provider, "link");
    return NextResponse.json({ ok: false, ...payload }, { status: 502 });
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireAdmin(request);
    if (!adminDb) return NextResponse.json({ error: "Firebase Admin is not configured" }, { status: 503 });
    const { id } = await context.params;
    const parsed = unlinkSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ error: "Invalid unlink request" }, { status: 400 });
    const links = (await getAssetLinks(id)).filter((link) => !parsed.data.provider || link.provider === parsed.data.provider);
    const db = adminDb;
    await Promise.all(links.map((link) => db.collection(COLLECTIONS.ASSET_EXTERNAL_LINKS).doc(link.id).set({ status: "manual_required", updatedAt: new Date() }, { merge: true })));
    await db.collection(COLLECTIONS.ASSET_HISTORY).add({ assetId: id, action: "external_link_removed", performedByUid: actor.uid, performedByName: actor.email, createdAt: new Date() });
    return NextResponse.json({ ok: true, unlinked: links.length });
  } catch (error) {
    const authError = authErrorResponse(error);
    if (authError) return authError;
    console.error("Asset unlink error:", error);
    return NextResponse.json({ error: "Unable to unlink asset" }, { status: 500 });
  }
}
