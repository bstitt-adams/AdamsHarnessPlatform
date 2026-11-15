import { NextRequest, NextResponse } from "next/server";
import { ApiAuthError, authErrorResponse, requireAdmin } from "@/lib/auth/server-auth";
import { adminDb } from "@/lib/firebase-admin";
import { httpErrorResponse } from "@/lib/adams-harness/server-store";
import { resolveSiteDocsConfig, sitedocsClient, SITEDOCS_DEFAULT_BASE_URL } from "@/lib/sitedocs/client";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";

const testSchema = z.object({
  apiKey: z.string().optional(),
  baseUrl: z.string().url().optional(),
  persist: z.boolean().optional(),
});

/**
 * Test the SiteDocs connection. With persist: true (default when apiKey
 * supplied), saves the key to platformSecrets/sitedocs and baseUrl to
 * platformSettings/global.sitedocs.
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);
    const parsed = testSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const { apiKey, baseUrl, persist = true } = parsed.data;

    const stored = await resolveSiteDocsConfig();
    const config = {
      apiKey: apiKey || stored?.apiKey || "",
      baseUrl: (baseUrl || stored?.baseUrl || SITEDOCS_DEFAULT_BASE_URL).replace(/\/+$/, ""),
    };
    if (!config.apiKey) {
      return NextResponse.json({ ok: false, error: "No SiteDocs API key configured" }, { status: 400 });
    }

    const account = await sitedocsClient.account(config);

    if (persist && adminDb) {
      const batch = adminDb.batch();
      if (apiKey) {
        batch.set(adminDb.collection("platformSecrets").doc("sitedocs"), { apiKey, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      }
      batch.set(
        adminDb.collection("platformSettings").doc("global"),
        {
          sitedocs: {
            baseUrl: config.baseUrl,
            lastConnectionStatus: "ok",
            lastTestedAt: FieldValue.serverTimestamp(),
          },
        },
        { merge: true },
      );
      await batch.commit();
    }

    return NextResponse.json({ ok: true, account, persisted: persist && Boolean(apiKey) });
  } catch (error) {
    if (error instanceof ApiAuthError) return authErrorResponse(error);
    const http = httpErrorResponse(error);
    if (http) return http;
    const message = error instanceof Error ? error.message : "SiteDocs connection failed";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
