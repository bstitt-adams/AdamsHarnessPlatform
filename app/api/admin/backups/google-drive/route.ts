/**
 * Google Drive Integration API Routes
 * GET - Get Google Drive connection status
 * POST - Connect/disconnect Google Drive
 */

import { NextRequest, NextResponse } from "next/server";
import { googleDriveProvider, GoogleDriveProvider } from "@/lib/services/storage-providers/google-drive-provider";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";

export async function GET(request: NextRequest) {
  try {
    const config = await googleDriveProvider.loadConfig();

    return NextResponse.json({
      success: true,
      connected: config?.connected || false,
      email: config?.email,
      folderName: config?.folderName,
      lastSyncAt: config?.lastSyncAt?.toDate?.()?.toISOString(),
    });
  } catch (error) {
    console.error("Error getting Google Drive status:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, code, redirectUri } = body;

    if (action === "get-auth-url") {
      if (!GOOGLE_CLIENT_ID) {
        return NextResponse.json(
          { success: false, error: "Google OAuth not configured. Please set GOOGLE_CLIENT_ID in environment variables." },
          { status: 400 }
        );
      }

      const authUrl = GoogleDriveProvider.getAuthUrl(
        GOOGLE_CLIENT_ID,
        redirectUri,
        "backup-setup"
      );

      return NextResponse.json({
        success: true,
        authUrl,
      });
    }

    if (action === "exchange-code") {
      if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
        return NextResponse.json(
          { success: false, error: "Google OAuth not configured" },
          { status: 400 }
        );
      }

      // Exchange code for tokens
      const credentials = await GoogleDriveProvider.exchangeCodeForTokens(
        code,
        GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET,
        redirectUri
      );

      // Get user email
      const email = await GoogleDriveProvider.getUserEmail(credentials.accessToken);

      // Save configuration
      await googleDriveProvider.saveConfig({
        credentials,
        email,
        connected: true,
      });

      // Create backup folder
      const folderId = await googleDriveProvider.getOrCreateBackupFolder(credentials.accessToken);

      return NextResponse.json({
        success: true,
        email,
        folderId,
      });
    }

    if (action === "disconnect") {
      await googleDriveProvider.disconnect();

      return NextResponse.json({
        success: true,
        message: "Google Drive disconnected",
      });
    }

    if (action === "test-connection") {
      const config = await googleDriveProvider.loadConfig();
      
      if (!config?.connected || !config?.credentials) {
        return NextResponse.json(
          { success: false, error: "Google Drive not connected" },
          { status: 400 }
        );
      }

      const accessToken = await googleDriveProvider.getAccessToken(
        GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET
      );

      const quota = await googleDriveProvider.getStorageQuota(accessToken);
      const files = await googleDriveProvider.listFiles(accessToken);

      return NextResponse.json({
        success: true,
        quota,
        backupCount: files.length,
        files: files.slice(0, 5), // Return last 5 backups
      });
    }

    return NextResponse.json(
      { success: false, error: "Invalid action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Google Drive API error:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
