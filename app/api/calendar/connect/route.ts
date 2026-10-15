import { NextRequest, NextResponse } from "next/server";
import { getGoogleAuthUrl, GOOGLE_CALENDAR_SCOPES } from "@/lib/google-calendar";
import { getMicrosoftAuthUrl, TRACTION_MS_SCOPES } from "@/lib/microsoft-graph";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const provider = searchParams.get("provider");
    const userId = searchParams.get("userId");

    if (!provider || !["google", "microsoft"].includes(provider)) {
      return NextResponse.json(
        { error: "Invalid provider. Must be 'google' or 'microsoft'" },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    if (provider === "google") {
      const config = {
        clientId: process.env.GOOGLE_CLIENT_ID || "",
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
        redirectUri: `${baseUrl}/api/calendar/google/callback`,
        scopes: GOOGLE_CALENDAR_SCOPES,
      };

      if (!config.clientId) {
        return NextResponse.json(
          { error: "Google Calendar integration not configured" },
          { status: 500 }
        );
      }

      const authUrl = getGoogleAuthUrl(config, userId);
      return NextResponse.redirect(authUrl);
    } else if (provider === "microsoft") {
      const config = {
        clientId: process.env.MICROSOFT_CLIENT_ID || "",
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET || "",
        tenantId: process.env.MICROSOFT_TENANT_ID || "common",
        redirectUri: `${baseUrl}/api/calendar/microsoft/callback`,
        scopes: TRACTION_MS_SCOPES,
      };

      if (!config.clientId) {
        return NextResponse.json(
          { error: "Microsoft Calendar integration not configured" },
          { status: 500 }
        );
      }

      const authUrl = getMicrosoftAuthUrl(config, userId);
      return NextResponse.redirect(authUrl);
    }

    return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
  } catch (error) {
    console.error("Calendar connect error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
