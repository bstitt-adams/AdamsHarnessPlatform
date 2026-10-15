import { NextRequest } from "next/server";
import {
  authErrorResponse,
  requireAdmin,
  ApiAuthError,
} from "@/lib/auth/server-auth";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { getHermesHealth } from "@/lib/hermes/client";
import { getGitHubHealth } from "@/lib/integrations/github";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const [hermes, github] = await Promise.all([
      getHermesHealth(),
      getGitHubHealth(),
    ]);
    return Response.json({
      firebaseAdmin: {
        configured: Boolean(adminDb && adminAuth),
      },
      hermes,
      github,
      webhookSecretConfigured: Boolean(process.env.GITHUB_WEBHOOK_SECRET?.trim()),
      cronSecretConfigured: Boolean(process.env.CRON_SECRET?.trim()),
      hermesWorkspaceConfigured: Boolean(
        process.env.HERMES_BUILD_WORKSPACE?.trim(),
      ),
    });
  } catch (error) {
    if (error instanceof ApiAuthError) return authErrorResponse(error);
    console.error("Health error:", error);
    return Response.json({ error: "Health check failed." }, { status: 500 });
  }
}
