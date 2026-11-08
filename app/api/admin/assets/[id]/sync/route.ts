import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authErrorResponse, requireAdmin } from "@/lib/auth/server-auth";
import { adminDb } from "@/lib/firebase-admin";
import { COLLECTIONS, type UserAssetDoc } from "@/lib/schema";
import { resolveAssetIntegrationConfig } from "@/lib/asset-integrations/config";
import { getAssetLinks, pullAssetFromProvider, pushAssetToProvider } from "@/lib/asset-integrations/sync";

const syncSchema = z.object({
  provider: z.enum(["jamf", "ninjaOne"]),
  direction: z.enum(["inbound", "outbound"]).default("outbound"),
});

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireAdmin(request);
    if (!adminDb) return NextResponse.json({ error: "Firebase Admin is not configured" }, { status: 503 });
    const { id } = await context.params;
    const parsed = syncSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid asset sync request" }, { status: 400 });
    const snap = await adminDb.collection(COLLECTIONS.USER_ASSETS).doc(id).get();
    if (!snap.exists) return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    const asset = { id: snap.id, ...snap.data() } as UserAssetDoc;
    const config = await resolveAssetIntegrationConfig();
    const actorInfo = { uid: actor.uid, name: actor.email };
    if (parsed.data.direction === "outbound") {
      const result = await pushAssetToProvider(asset, parsed.data.provider, config, actorInfo, true);
      return NextResponse.json({ ok: result.status === "success" || result.status === "skipped", result });
    }
    const link = (await getAssetLinks(id)).find((item) => item.provider === parsed.data.provider);
    if (!link) return NextResponse.json({ ok: false, error: `No ${parsed.data.provider} remote record is linked to this asset.` }, { status: 404 });
    const result = await pullAssetFromProvider(asset, link, config, actorInfo);
    return NextResponse.json({ ok: result.status === "success", result });
  } catch (error) {
    const authError = authErrorResponse(error);
    if (authError) return authError;
    console.error("Asset sync error:", error);
    return NextResponse.json({ error: "Unable to sync asset" }, { status: 500 });
  }
}
