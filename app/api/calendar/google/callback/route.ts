import { NextRequest, NextResponse } from "next/server";
import { exchangeGoogleCode, GOOGLE_CALENDAR_SCOPES } from "@/lib/google-calendar";
import { saveCalendarIntegration } from "@/lib/calendar-sync-service";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state"); // Contains userId
    const error = searchParams.get("error");

    if (error) {
      return NextResponse.redirect(
        new URL(`/portal/settings?error=${encodeURIComponent(error)}`, request.url)
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
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      redirectUri: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/calendar/google/callback`,
      scopes: GOOGLE_CALENDAR_SCOPES,
    };

    const result = await exchangeGoogleCode(config, code);

    if (!result.success || !result.data) {
      return NextResponse.redirect(
        new URL(`/portal/settings?error=${encodeURIComponent(result.error || "Token exchange failed")}`, request.url)
      );
    }

    // Get user email from Google
    const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${result.data.accessToken}` },
    });
    const userInfo = await userInfoResponse.json();

    // Save the integration
    const saved = await saveCalendarIntegration(state, {
      userId: state,
      provider: "google",
      email: userInfo.email || "unknown",
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
      new URL("/portal/settings?success=Google Calendar connected successfully", request.url)
    );
  } catch (error) {
    console.error("Google Calendar callback error:", error);
    return NextResponse.redirect(
      new URL(`/portal/settings?error=${encodeURIComponent("An error occurred")}`, request.url)
    );
  }
}
