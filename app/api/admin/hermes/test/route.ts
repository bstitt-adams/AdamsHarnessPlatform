import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authErrorResponse, requireAdmin } from "@/lib/auth/server-auth";
import { adminDb } from "@/lib/firebase-admin";
import { buildHermesConfig, pingHermes, resolveHermesConfig } from "@/lib/hermes/client";

const testSchema = z.object({
  mode: z.enum(["local", "remote", "env"]),
  localUrl: z.string().trim().max(500).optional().default(""),
  remoteUrl: z.string().trim().max(500).optional().default(""),
  apiKey: z.string().max(1000).optional().default(""),
  model: z.string().trim().min(1).max(200).default("hermes-agent"),
});

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);
    const parsed = testSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid Hermes configuration" }, { status: 400 });
    }
    const config = parsed.data.mode === "env"
      ? await resolveHermesConfig()
      : buildHermesConfig(
          parsed.data.mode === "local" ? parsed.data.localUrl : parsed.data.remoteUrl,
          parsed.data.apiKey,
          parsed.data.model,
        );
    if (!config) {
      return NextResponse.json({ error: "Hermes environment configuration is missing" }, { status: 400 });
    }
    if (parsed.data.mode !== "env" && !(parsed.data.mode === "local" ? parsed.data.localUrl : parsed.data.remoteUrl)) {
      return NextResponse.json({ error: `${parsed.data.mode} Hermes URL is required` }, { status: 400 });
    }
    const result = await pingHermes(config);
    if (result.ok && adminDb && parsed.data.mode !== "env") {
      await Promise.all([
        adminDb.collection("platformSecrets").doc("hermes").set({ apiKey: parsed.data.apiKey }, { merge: true }),
        adminDb.collection("platformSettings").doc("global").set({
          hermes: {
            mode: parsed.data.mode,
            localUrl: parsed.data.localUrl,
            remoteUrl: parsed.data.remoteUrl,
            model: parsed.data.model,
            status: "connected",
            lastTested: new Date(),
          },
        }, { merge: true }),
      ]);
    }
    return NextResponse.json(result, { status: result.ok ? 200 : 502 });
  } catch (error) {
    const authError = authErrorResponse(error);
    if (authError) return authError;
    console.error("Hermes test error:", error);
    return NextResponse.json({ error: "Hermes test failed" }, { status: 500 });
  }
}
