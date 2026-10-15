/**
 * Microsoft OAuth Initiation Route
 * 
 * Redirects users to Microsoft's OAuth authorization endpoint
 * to begin the authentication flow
 */

import { NextRequest, NextResponse } from "next/server";
import { TRACTION_MS_SCOPES } from "@/lib/microsoft-graph";

// Get Microsoft config from environment
function getMicrosoftConfig() {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const tenantId = process.env.MICROSOFT_TENANT_ID || "common";
  const redirectUri = process.env.MICROSOFT_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/microsoft/callback`;

  if (!clientId) {
    return null;
  }

  return {
    clientId,
    tenantId,
    redirectUri,
    scopes: TRACTION_MS_SCOPES,
  };
}

export async function GET(request: NextRequest) {
  const config = getMicrosoftConfig();

  if (!config) {
    // Redirect to sign-in with error if Microsoft is not configured
    return NextResponse.redirect(
      new URL("/sign-in?error=Microsoft+SSO+is+not+configured", request.url)
    );
  }

  // Get optional state from query params (e.g., userId for linking)
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get("userId");
  const returnUrl = searchParams.get("returnUrl") || "/portal";

  // Create state object to pass through OAuth flow
  const state = Buffer.from(
    JSON.stringify({
      userId,
      returnUrl,
      timestamp: Date.now(),
    })
  ).toString("base64");

  // Build Microsoft OAuth authorization URL
  const authUrl = new URL(
    `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/authorize`
  );

  authUrl.searchParams.set("client_id", config.clientId);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("redirect_uri", config.redirectUri);
  authUrl.searchParams.set("response_mode", "query");
  authUrl.searchParams.set("scope", config.scopes.join(" "));
  authUrl.searchParams.set("state", state);
  // Add prompt to ensure user can choose account
  authUrl.searchParams.set("prompt", "select_account");

  // Redirect to Microsoft login
  return NextResponse.redirect(authUrl.toString());
}
