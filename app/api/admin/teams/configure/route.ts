import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authErrorResponse, requireAdmin } from "@/lib/auth/server-auth";
import { adminDb } from "@/lib/firebase-admin";

const configSchema = z.object({
  enabled: z.boolean().default(true),
  appId: z.string().trim().max(256).optional().default(""),
  appPassword: z.string().trim().max(500).optional().default(""),
  tenantId: z.string().trim().max(256).optional().default(""),
  incomingWebhookUrl: z.string().trim().max(1000).optional().default(""),
  webhookSecret: z.string().trim().max(256).optional().default(""),
  webhookUrl: z.string().url().optional(),
});

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);
    if (!adminDb) {
      return NextResponse.json({ error: "Firebase Admin is not configured" }, { status: 503 });
    }
    const parsed = configSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid Microsoft Teams configuration" }, { status: 400 });
    }

    const { enabled, appId, appPassword, tenantId, incomingWebhookUrl, webhookSecret } = parsed.data;
    const webhookUrl = parsed.data.webhookUrl || new URL("/api/teams/webhook", request.url).toString();

    if (!appId && !incomingWebhookUrl) {
      return NextResponse.json(
        { error: "Provide a Microsoft Bot App ID or an Incoming Webhook URL" },
        { status: 400 }
      );
    }

    // If Bot App ID + App Password are provided, verify credentials with Microsoft Identity Platform
    if (appId && appPassword) {
      const tokenTenant = tenantId || "botframework.com";
      const tokenUrl = `https://login.microsoftonline.com/${encodeURIComponent(tokenTenant)}/oauth2/v2.0/token`;
      const body = new URLSearchParams({
        grant_type: "client_credentials",
        client_id: appId,
        client_secret: appPassword,
        scope: "https://api.botframework.com/.default",
      });
      const tokenRes = await fetch(tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
        signal: AbortSignal.timeout(10_000),
      });
      if (!tokenRes.ok) {
        return NextResponse.json(
          { error: "Microsoft rejected the Bot App ID / App Password credentials" },
          { status: 502 }
        );
      }
    }

    // Store sensitive credentials in platformSecrets/teams
    await adminDb.collection("platformSecrets").doc("teams").set(
      {
        enabled,
        appId,
        ...(appPassword ? { appPassword } : {}),
        tenantId,
        incomingWebhookUrl,
        webhookSecret,
        webhookUrl,
        updatedAt: new Date(),
      },
      { merge: true }
    );

    // Store non-secret status in platformSettings/global
    await adminDb.collection("platformSettings").doc("global").set(
      {
        teams: {
          enabled,
          appId,
          tenantId,
          webhookUrl,
          status: enabled ? "connected" : "disconnected",
          lastTested: new Date(),
        },
        updatedAt: new Date(),
      },
      { merge: true }
    );

    return NextResponse.json({
      ok: true,
      enabled,
      appId,
      webhookUrl,
    });
  } catch (error) {
    const authError = authErrorResponse(error);
    if (authError) return authError;
    console.error("Microsoft Teams configuration error:", error);
    return NextResponse.json({ error: "Microsoft Teams configuration failed" }, { status: 500 });
  }
}
