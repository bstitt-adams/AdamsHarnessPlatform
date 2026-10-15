/**
 * Get an authenticated MicrosoftGraphClient for a user.
 * Refreshes the access token if expired and updates Firestore.
 */

import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { COLLECTIONS, type UserMicrosoftTokenDoc } from "@/lib/schema";
import { MicrosoftGraphClient, refreshMicrosoftToken, type MSGraphConfig } from "@/lib/microsoft-graph";
import { decryptToken, encryptToken } from "./token-crypto";

function getMicrosoftConfig(): MSGraphConfig | null {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  const tenantId = process.env.MICROSOFT_TENANT_ID || "common";
  const redirectUri = process.env.MICROSOFT_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/microsoft/callback`;

  if (!clientId || !clientSecret) {
    return null;
  }

  return {
    clientId,
    clientSecret,
    tenantId,
    redirectUri,
    scopes: ["User.Read", "Mail.Send", "Mail.Read", "Calendars.ReadWrite", "Sites.Read.All", "Sites.ReadWrite.All", "Files.ReadWrite.All"],
  };
}

export interface GetGraphClientResult {
  client: MicrosoftGraphClient;
  tokenDoc: UserMicrosoftTokenDoc;
}

export async function getUserGraphClient(userId: string): Promise<GetGraphClientResult> {
  if (!db) {
    throw new Error("Firestore is not initialized");
  }

  const tokenRef = doc(db, COLLECTIONS.USER_MICROSOFT_TOKENS, userId);
  const tokenSnap = await getDoc(tokenRef);

  if (!tokenSnap.exists()) {
    throw new Error(`No Microsoft token found for user ${userId}`);
  }

  const tokenDoc = tokenSnap.data() as UserMicrosoftTokenDoc;
  const now = Timestamp.now();

  let accessToken = decryptToken(tokenDoc.accessToken);
  const refreshToken = decryptToken(tokenDoc.refreshToken);

  if (!accessToken) {
    throw new Error("Microsoft access token is empty");
  }

  // Refresh if expired or about to expire (within 5 minutes)
  if (tokenDoc.expiresAt && tokenDoc.expiresAt.toMillis() - now.toMillis() < 5 * 60 * 1000) {
    if (!refreshToken) {
      throw new Error("Microsoft refresh token is empty");
    }

    const config = getMicrosoftConfig();
    if (!config) {
      throw new Error("Microsoft integration is not configured");
    }

    const refreshResult = await refreshMicrosoftToken(config, refreshToken);
    if (!refreshResult.success || !refreshResult.data) {
      await setDoc(
        tokenRef,
        {
          status: "error",
          lastError: refreshResult.error || "Token refresh failed",
          updatedAt: Timestamp.now(),
        },
        { merge: true }
      );
      throw new Error(refreshResult.error || "Token refresh failed");
    }

    accessToken = refreshResult.data.accessToken;
    await setDoc(
      tokenRef,
      {
        accessToken: encryptToken(accessToken),
        refreshToken: encryptToken(refreshResult.data.refreshToken || refreshToken),
        expiresAt: Timestamp.fromMillis(refreshResult.data.expiresAt),
        status: "connected",
        lastVerifiedAt: Timestamp.now(),
        lastError: "",
        updatedAt: Timestamp.now(),
      },
      { merge: true }
    );
  }

  const client = new MicrosoftGraphClient(accessToken);
  return { client, tokenDoc };
}

export async function updateTokenStatus(
  userId: string,
  status: UserMicrosoftTokenDoc["status"],
  lastError?: string
): Promise<void> {
  if (!db) return;
  const tokenRef = doc(db, COLLECTIONS.USER_MICROSOFT_TOKENS, userId);
  await setDoc(
    tokenRef,
    {
      status,
      lastError: lastError || "",
      updatedAt: Timestamp.now(),
    },
    { merge: true }
  );
}
