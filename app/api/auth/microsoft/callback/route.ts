/**
 * Microsoft OAuth Callback Handler
 * 
 * Handles the OAuth callback from Microsoft after user authorization
 * Exchanges the authorization code for access tokens
 */

import { NextRequest, NextResponse } from "next/server";
import { exchangeMicrosoftCode, MSGraphConfig, TRACTION_MS_SCOPES, MicrosoftGraphClient } from "@/lib/microsoft-graph";
import { doc, setDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { COLLECTIONS } from "@/lib/schema";
import { encryptToken } from "@/lib/mail/token-crypto";

// Get Microsoft config from environment
function getMicrosoftConfig(): MSGraphConfig | null {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  const tenantId = process.env.MICROSOFT_TENANT_ID || "common";
  const redirectUri = process.env.MICROSOFT_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/microsoft/callback`;

  if (!clientId) {
    return null;
  }

  return {
    clientId,
    clientSecret,
    tenantId,
    redirectUri,
    scopes: TRACTION_MS_SCOPES,
  };
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  // Handle OAuth errors
  if (error) {
    console.error("Microsoft OAuth error:", error, errorDescription);
    return NextResponse.redirect(
      new URL(`/portal/settings?error=${encodeURIComponent(errorDescription || error)}`, request.url)
    );
  }

  // Validate code
  if (!code) {
    return NextResponse.redirect(
      new URL("/portal/settings?error=No authorization code received", request.url)
    );
  }

  // Get Microsoft config
  const config = getMicrosoftConfig();
  if (!config) {
    return NextResponse.redirect(
      new URL("/portal/settings?error=Microsoft integration not configured", request.url)
    );
  }

  try {
    // Exchange code for tokens
    const result = await exchangeMicrosoftCode(config, code);

    if (!result.success || !result.data) {
      return NextResponse.redirect(
        new URL(`/portal/settings?error=${encodeURIComponent(result.error || "Token exchange failed")}`, request.url)
      );
    }

    // Parse state to get user ID (if provided)
    let userId = "default";
    if (state) {
      try {
        const stateData = JSON.parse(atob(state));
        userId = stateData.userId || "default";
      } catch {
        // State parsing failed, use default
      }
    }

    // Fetch Microsoft profile to get email/display name
    let msEmail = "";
    let msDisplayName = "";
    const graphClient = new MicrosoftGraphClient(result.data.accessToken);
    const profileResult = await graphClient.getMe();
    if (profileResult.success && profileResult.data) {
      msEmail = profileResult.data.mail || profileResult.data.userPrincipalName || "";
      msDisplayName = profileResult.data.displayName || "";
    }

    // Store tokens in per-user collection (encrypted when key is configured)
    if (db) {
      await setDoc(
        doc(db, COLLECTIONS.USER_MICROSOFT_TOKENS, userId),
        {
          id: userId,
          userId,
          email: msEmail,
          displayName: msDisplayName,
          accessToken: encryptToken(result.data.accessToken),
          refreshToken: encryptToken(result.data.refreshToken || ""),
          expiresAt: Timestamp.fromMillis(result.data.expiresAt),
          scopes: TRACTION_MS_SCOPES,
          status: "connected",
          lastVerifiedAt: Timestamp.now(),
          lastError: "",
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        },
        { merge: true }
      );

      // Keep a backward-compatible integration flag for the settings page
      await setDoc(
        doc(db, COLLECTIONS.PLATFORM_SETTINGS, "default"),
        {
          integrations: {
            microsoft: {
              connected: true,
              connectedAt: Timestamp.now(),
              scopes: TRACTION_MS_SCOPES,
            },
          },
        },
        { merge: true }
      );
    }

    // Redirect back to settings with success
    return NextResponse.redirect(
      new URL("/portal/settings?success=Microsoft account connected successfully", request.url)
    );
  } catch (error) {
    console.error("Microsoft OAuth callback error:", error);
    return NextResponse.redirect(
      new URL(`/portal/settings?error=${encodeURIComponent("Failed to connect Microsoft account")}`, request.url)
    );
  }
}
