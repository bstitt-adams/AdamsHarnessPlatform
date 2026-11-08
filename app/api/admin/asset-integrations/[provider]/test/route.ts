import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Timestamp } from "firebase-admin/firestore";
import { authErrorResponse, requireAdmin } from "@/lib/auth/server-auth";
import { adminDb } from "@/lib/firebase-admin";
import { COLLECTIONS } from "@/lib/schema";
import { resolveAssetIntegrationConfig } from "@/lib/asset-integrations/config";
import { runAssetIntegrationTest } from "@/lib/asset-integrations/capability-test";

const bodySchema = z.object({ mode: z.enum(["connectivity", "capability", "crud"]).default("connectivity") });

function providerParam(value: string) {
  return value === "jamf" ? "jamf" : value === "ninjaOne" || value === "ninjaone" ? "ninjaOne" : null;
}

export async function POST(request: NextRequest, context: { params: Promise<{ provider: string }> }) {
  try {
    const actor = await requireAdmin(request);
    const provider = providerParam((await context.params).provider);
    if (!provider) return NextResponse.json({ error: "Unsupported asset provider" }, { status: 404 });
    const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ error: "Invalid test mode" }, { status: 400 });
    const config = await resolveAssetIntegrationConfig();
    const result = await runAssetIntegrationTest(provider, config, parsed.data.mode);
    if (adminDb) {
      await adminDb.collection(COLLECTIONS.ASSET_SYNC_RUNS).add({
        provider,
        operation: parsed.data.mode === "crud" ? "crud-smoke" : parsed.data.mode === "capability" ? "capability" : "test",
        direction: "none",
        status: result.ok ? "success" : "failed",
        results: result.errors?.map((item) => ({ status: "failed", message: item.error, remediation: item.remediation })) || [],
        remediation: result.errors?.flatMap((item) => item.remediation) || [],
        actorUid: actor.uid,
        actorName: actor.email,
        startedAt: Timestamp.now(),
        completedAt: Timestamp.now(),
        createdAt: Timestamp.now(),
      });
    }
    return NextResponse.json(result, { status: result.ok ? 200 : 502 });
  } catch (error) {
    const authError = authErrorResponse(error);
    if (authError) return authError;
    console.error("Asset integration test error:", error);
    return NextResponse.json({ error: "Asset integration test failed" }, { status: 500 });
  }
}
