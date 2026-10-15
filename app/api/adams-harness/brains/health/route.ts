import { NextRequest } from "next/server";
import {
  authErrorResponse,
  requireAdmin,
  ApiAuthError,
} from "@/lib/auth/server-auth";
import { adminStorage } from "@/lib/firebase-admin";
import { getHermesHealth } from "@/lib/hermes/client";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const hermes = await getHermesHealth();
    return Response.json({
      storage: { configured: !!adminStorage },
      hermes: { configured: hermes.configured, healthy: hermes.healthy },
      parsers: { pdf: true, docx: true, text: true },
    });
  } catch (error) {
    if (error instanceof ApiAuthError) return authErrorResponse(error);
    console.error("Brain health error:", error);
    return Response.json({ error: "Health check failed." }, { status: 500 });
  }
}
