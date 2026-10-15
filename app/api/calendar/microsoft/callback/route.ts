import { NextRequest, NextResponse } from "next/server";
import { exchangeMicrosoftCode, TRACTION_MS_SCOPES } from "@/lib/microsoft-graph";
import { saveCalendarIntegration } from "@/lib/calendar-sync-service";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state"); // Contains userId
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    if (error) {
      return NextResponse.redirect(
        new URL(`/portal/settings?error=${encodeURIComponent(errorDescription || error)}`, request.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL("/portal/settings?error=No authorization code received", request.url)
      );
    }

    if (!state) {
      return NextResponse.redirect(
        new URL("/portal/settings?error=Invalid state parameter", request.url)
      );
    }

    const config = {
      clientId: process.env.MICROSOFT_CLIENT_ID || "",
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET || "",
      tenantId: process.env.MICROSOFT_TENANT_ID || "common",
      redirectUri: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/calendar/microsoft/callback`,
      scopes: TRACTION_MS_SCOPES,
    };

    const result = await exchangeMicrosoftCode(config, code);

    if (!result.success || !result.data) {
      return NextResponse.redirect(
        new URL(`/portal/settings?error=${encodeURIComponent(result.error || "Token exchange failed")}`, request.url)
      );
    }

    // Get user email from Microsoft Graph
    const userInfoResponse = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: { Authorization: `Bearer ${result.data.accessToken}` },
    });
    const userInfo = await userInfoResponse.json();

    // Save the integration
    const saved = await saveCalendarIntegration(state, {
      userId: state,
      provider: "microsoft",
      email: userInfo.mail || userInfo.userPrincipalName || "unknown",
      accessToken: result.data.accessToken,
      refreshToken: result.data.refreshToken,
      expiresAt: result.data.expiresAt,
      isActive: true,
    });

    if (!saved) {
      return NextResponse.redirect(
        new URL("/portal/settings?error=Failed to save integration", request.url)
      );
    }

    return NextResponse.redirect(
      new URL("/portal/settings?success=Microsoft Calendar connected successfully", request.url)
    );
  } catch (error) {
    console.error("Microsoft Calendar callback error:", error);
    return NextResponse.redirect(
      new URL(`/portal/settings?error=${encodeURIComponent("An error occurred")}`, request.url)
    );
  }
}
