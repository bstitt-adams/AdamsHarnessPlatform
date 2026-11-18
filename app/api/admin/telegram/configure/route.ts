import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "node:crypto";
import { authErrorResponse, requireAdmin } from "@/lib/auth/server-auth";
import { adminDb } from "@/lib/firebase-admin";

const configSchema = z.object({
  enabled: z.boolean().default(true),
  botToken: z.string().trim().min(10).max(500),
  webhookSecret: z.string().trim().max(256).regex(/^[A-Za-z0-9_-]*$/).optional().default(""),
  webhookUrl: z.string().url().optional(),
  platformDataEnabled: z.boolean().optional(),
  platformAdminTelegramUserId: z.string().regex(/^[1-9][0-9]{0,15}$/).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const actor = await requireAdmin(request);
    if (!adminDb) return NextResponse.json({ error: "Firebase Admin is not configured" }, { status: 503 });
    const parsed = configSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid Telegram configuration" }, { status: 400 });

    const { botToken, enabled } = parsed.data;
    const webhookSecret = parsed.data.webhookSecret || randomBytes(32).toString("hex");
    if (parsed.data.platformDataEnabled) {
      const { resolveHermesConfig } = await import("@/lib/hermes/client");
      const interpreterRoot = process.env.TELEGRAM_PLATFORM_INTERPRETER_URL?.trim();
      const base = await resolveHermesConfig();
      if (!interpreterRoot && !base) {
        return NextResponse.json({ error: "Hermes must be configured (Settings → Hermes) for the tool-disabled platformdata interpreter profile" }, { status: 400 });
      }
      if (!parsed.data.platformAdminTelegramUserId) {
        return NextResponse.json({ error: "Your numeric Telegram user ID is required for platform access" }, { status: 400 });
      }
    }
    const platformConfig = parsed.data.platformDataEnabled === undefined ? {} : {
      platformDataEnabled: parsed.data.platformDataEnabled,
      platformAdminUid: actor.uid,
      platformAdminTelegramUserId: parsed.data.platformAdminTelegramUserId || "",
    };
    const webhookUrl = parsed.data.webhookUrl || new URL("/api/telegram/webhook", request.url).toString();
    const baseUrl = `https://api.telegram.org/bot${botToken}`;
    const meResponse = await fetch(`${baseUrl}/getMe`, { signal: AbortSignal.timeout(10_000) });
    const me = await meResponse.json().catch(() => ({}));
    if (!meResponse.ok || !me.ok) {
      return NextResponse.json({ error: "Telegram rejected the bot token" }, { status: 502 });
    }

    if (enabled) {
      const webhookResponse = await fetch(`${baseUrl}/setWebhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: webhookUrl,
          ...(webhookSecret ? { secret_token: webhookSecret } : {}),
          allowed_updates: ["message"],
        }),
        signal: AbortSignal.timeout(10_000),
      });
      const webhookResult = await webhookResponse.json().catch(() => ({}));
      if (!webhookResponse.ok || !webhookResult.ok) {
        return NextResponse.json({ error: "Telegram rejected the webhook configuration" }, { status: 502 });
      }
    }

    await adminDb.collection("platformSecrets").doc("telegram").set({
      enabled,
      botToken,
      webhookSecret,
      webhookUrl,
      botUsername: me.result?.username || "",
      ...platformConfig,
      updatedAt: new Date(),
    }, { merge: true });
    await adminDb.collection("platformSettings").doc("global").set({
      telegram: {
        enabled,
        ...(parsed.data.platformDataEnabled === undefined ? {} : {
          platformDataEnabled: parsed.data.platformDataEnabled,
          platformAdminTelegramUserId: parsed.data.platformAdminTelegramUserId || "",
        }),
        webhookUrl,
        botUsername: me.result?.username || "",
        status: enabled ? "connected" : "disconnected",
        lastTested: new Date(),
      },
      updatedAt: new Date(),
    }, { merge: true });

    return NextResponse.json({
      ok: true,
      enabled,
      webhookUrl,
      botUsername: me.result?.username || "",
    });
  } catch (error) {
    const authError = authErrorResponse(error);
    if (authError) return authError;
    console.error("Telegram configuration error:", error);
    return NextResponse.json({ error: "Telegram configuration failed" }, { status: 500 });
  }
}
