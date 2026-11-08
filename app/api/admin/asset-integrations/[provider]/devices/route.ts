import { NextRequest, NextResponse } from "next/server";
import { authErrorResponse, requireAdmin } from "@/lib/auth/server-auth";
import { resolveAssetIntegrationConfig } from "@/lib/asset-integrations/config";
import { errorPayload } from "@/lib/asset-integrations/errors";
import { getProviderClient } from "@/lib/asset-integrations/providers";

export async function GET(request: NextRequest, context: { params: Promise<{ provider: string }> }) {
  const providerValue = (await context.params).provider;
  const provider = providerValue === "jamf" ? "jamf" : providerValue === "ninjaOne" || providerValue === "ninjaone" ? "ninjaOne" : null;
  if (!provider) return NextResponse.json({ error: "Unsupported asset provider" }, { status: 404 });
  try {
    await requireAdmin(request);
    const config = await resolveAssetIntegrationConfig();
    const client = getProviderClient(provider, config);
    const result = await client.listDevices(request.nextUrl.searchParams.get("cursor") || "");
    return NextResponse.json({ ok: true, provider, devices: result.assets, nextCursor: result.nextCursor });
  } catch (error) {
    const authError = authErrorResponse(error);
    if (authError) return authError;
    const payload = errorPayload(error, provider, "read");
    return NextResponse.json({ ok: false, ...payload, provider }, { status: payload.vendorStatus === 401 || payload.vendorStatus === 403 ? 502 : 500 });
  }
}
