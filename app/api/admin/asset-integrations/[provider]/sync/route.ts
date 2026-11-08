import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authErrorResponse, requireAdmin } from "@/lib/auth/server-auth";
import { adminDb } from "@/lib/firebase-admin";
import { COLLECTIONS, type UserAssetDoc } from "@/lib/schema";
import { resolveAssetIntegrationConfig } from "@/lib/asset-integrations/config";
import { errorPayload } from "@/lib/asset-integrations/errors";
import { pushAssetToProvider, runInboundSync } from "@/lib/asset-integrations/sync";

const bodySchema = z.object({ direction: z.enum(["inbound", "outbound"]).default("inbound"), limit: z.number().int().min(1).max(500).default(100) });

export async function POST(request: NextRequest, context: { params: Promise<{ provider: string }> }) {
  const providerValue = (await context.params).provider;
  const provider = providerValue === "jamf" ? "jamf" : providerValue === "ninjaOne" || providerValue === "ninjaone" ? "ninjaOne" : null;
  if (!provider) return NextResponse.json({ error: "Unsupported asset provider" }, { status: 404 });
  try {
    const actor = await requireAdmin(request);
    const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ error: "Invalid sync request" }, { status: 400 });
    const config = await resolveAssetIntegrationConfig();
    const actorInfo = { uid: actor.uid, name: actor.email };
    if (parsed.data.direction === "inbound") {
      const result = await runInboundSync(provider, config, actorInfo);
      return NextResponse.json({ ok: true, ...result });
    }
    if (!adminDb) return NextResponse.json({ error: "Firebase Admin is not configured" }, { status: 503 });
    const snap = await adminDb.collection(COLLECTIONS.USER_ASSETS).limit(parsed.data.limit).get();
    const assets = snap.docs.map((item) => ({ id: item.id, ...item.data() }) as UserAssetDoc);
    const results = [];
    for (const asset of assets) results.push({ assetId: asset.id, ...(await pushAssetToProvider(asset, provider, config, actorInfo)) });
    const failed = results.filter((item) => item.status === "failed");
    return NextResponse.json({ ok: failed.length === 0, provider, direction: "outbound", totalAssets: assets.length, succeeded: results.length - failed.length, failed: failed.length, results });
  } catch (error) {
    const authError = authErrorResponse(error);
    if (authError) return authError;
    const payload = errorPayload(error, provider, "sync");
    return NextResponse.json({ ok: false, ...payload, provider }, { status: 502 });
  }
}
