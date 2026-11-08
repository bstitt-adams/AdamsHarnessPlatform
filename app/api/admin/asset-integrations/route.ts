import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authErrorResponse, requireAdmin } from "@/lib/auth/server-auth";
import { adminDb } from "@/lib/firebase-admin";
import { publicAssetIntegrationStatus, resolveAssetIntegrationConfig } from "@/lib/asset-integrations/config";
import { providerCapabilities } from "@/lib/asset-integrations/providers";

const configSchema = z.object({
  jamf: z.object({
    enabled: z.boolean().default(false),
    baseUrl: z.string().trim().max(500).optional().default(""),
    clientId: z.string().trim().max(500).optional().default(""),
    clientSecret: z.string().trim().max(2000).optional().default(""),
    syncComputers: z.boolean().default(true),
    syncMobileDevices: z.boolean().default(true),
    allowLegacyMobileWriteApi: z.boolean().default(false),
    importUnmatched: z.boolean().default(true),
  }),
  ninjaOne: z.object({
    enabled: z.boolean().default(false),
    region: z.string().trim().max(50).default("app"),
    baseUrl: z.string().trim().max(500).optional().default(""),
    clientId: z.string().trim().max(500).optional().default(""),
    clientSecret: z.string().trim().max(2000).optional().default(""),
    organizationId: z.number().int().positive().optional(),
    locationId: z.number().int().positive().optional(),
    unmanagedRoleId: z.number().int().positive().optional(),
    createMode: z.enum(["linkOnly", "unmanaged", "staged"]).default("unmanaged"),
    importUnmatched: z.boolean().default(true),
  }),
});

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const config = await resolveAssetIntegrationConfig();
    return NextResponse.json({
      ok: true,
      config: publicAssetIntegrationStatus(config),
      capabilities: { jamf: providerCapabilities("jamf"), ninjaOne: providerCapabilities("ninjaOne") },
    });
  } catch (error) {
    const authError = authErrorResponse(error);
    if (authError) return authError;
    console.error("Asset integrations status error:", error);
    return NextResponse.json({ error: "Unable to load asset integrations" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);
    if (!adminDb) return NextResponse.json({ error: "Firebase Admin is not configured" }, { status: 503 });
    const parsed = configSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid asset integration configuration" }, { status: 400 });
    const current = await resolveAssetIntegrationConfig();
    const input = parsed.data;

    if (input.jamf.baseUrl && !/^https:\/\//.test(input.jamf.baseUrl)) {
      return NextResponse.json({ error: "Jamf base URL must use https://" }, { status: 400 });
    }
    if (input.ninjaOne.baseUrl && !/^https:\/\//.test(input.ninjaOne.baseUrl)) {
      return NextResponse.json({ error: "NinjaOne base URL must use https://" }, { status: 400 });
    }

    const jamfSecret = {
      clientId: input.jamf.clientId || current.jamf.clientId,
      clientSecret: input.jamf.clientSecret || current.jamf.clientSecret,
    };
    const ninjaSecret = {
      clientId: input.ninjaOne.clientId || current.ninjaOne.clientId,
      clientSecret: input.ninjaOne.clientSecret || current.ninjaOne.clientSecret,
    };

    const { clientSecret: _jamfSecret, ...jamfSettings } = input.jamf;
    const { clientSecret: _ninjaSecret, ...ninjaSettings } = input.ninjaOne;
    await Promise.all([
      adminDb.collection("platformSecrets").doc("assetManagement").set({ jamf: jamfSecret, ninjaOne: ninjaSecret, updatedAt: new Date() }, { merge: true }),
      adminDb.collection("platformSettings").doc("global").set({
        assetIntegrations: {
          jamf: { ...jamfSettings, clientId: jamfSecret.clientId, updatedAt: new Date() },
          ninjaOne: { ...ninjaSettings, clientId: ninjaSecret.clientId, updatedAt: new Date() },
        },
        updatedAt: new Date(),
      }, { merge: true }),
    ]);

    const resolved = await resolveAssetIntegrationConfig();
    return NextResponse.json({ ok: true, config: publicAssetIntegrationStatus(resolved) });
  } catch (error) {
    const authError = authErrorResponse(error);
    if (authError) return authError;
    console.error("Asset integrations configuration error:", error);
    return NextResponse.json({ error: "Unable to save asset integrations" }, { status: 500 });
  }
}
