import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authErrorResponse, requireAdmin } from "@/lib/auth/server-auth";
import { adminDb } from "@/lib/firebase-admin";

const configSchema = z.object({
  enabled: z.boolean().default(true),
  botToken: z.string().trim().min(10).max(500),
  webhookSecret: z.string().trim().max(256).optional().default(""),
  webhookUrl: z.string().url().optional(),
});

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);
    if (!adminDb) return NextResponse.json({ error: "Firebase Admin is not configured" }, { status: 503 });
    const parsed = configSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid Telegram configuration" }, { status: 400 });

    const { botToken, webhookSecret, enabled } = parsed.data;
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
      updatedAt: new Date(),
    }, { merge: true });
    await adminDb.collection("platformSettings").doc("global").set({
      telegram: {
        enabled,
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
