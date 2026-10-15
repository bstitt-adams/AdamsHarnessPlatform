/**
 * Google Drive Storage Provider for Backup System
 * Handles OAuth authentication and file operations with Google Drive
 */

import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { COLLECTIONS } from "@/lib/schema";

// ============================================================================
// Types
// ============================================================================

export interface GoogleDriveCredentials {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  tokenType: string;
  scope: string;
}

export interface GoogleDriveConfig {
  id: string;
  name: string;
  enabled: boolean;
  credentials?: GoogleDriveCredentials;
  folderId?: string;
  folderName?: string;
  email?: string;
  connected: boolean;
  lastSyncAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime?: string;
  modifiedTime?: string;
  webViewLink?: string;
  webContentLink?: string;
}

// ============================================================================
// Constants
// ============================================================================

const GOOGLE_DRIVE_CONFIG_ID = "google-drive-backup";
const BACKUP_FOLDER_NAME = "Adams Platform Backups";

// Google OAuth endpoints
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_DRIVE_API = "https://www.googleapis.com/drive/v3";
const GOOGLE_UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";

// Required scopes for Google Drive access
const SCOPES = [
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ");

// ============================================================================
// Google Drive Provider Class
// ============================================================================

export class GoogleDriveProvider {
  private config: GoogleDriveConfig | null = null;

  /**
   * Generate OAuth authorization URL
   */
  static getAuthUrl(clientId: string, redirectUri: string, state?: string): string {
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: SCOPES,
      access_type: "offline",
      prompt: "consent",
      ...(state && { state }),
    });

    return `${GOOGLE_AUTH_URL}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  static async exchangeCodeForTokens(
    code: string,
    clientId: string,
    clientSecret: string,
    redirectUri: string
  ): Promise<GoogleDriveCredentials> {
    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Token exchange failed: ${error.error_description || error.error}`);
    }

    const data = await response.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + data.expires_in * 1000,
      tokenType: data.token_type,
      scope: data.scope,
    };
  }

  /**
   * Refresh access token using refresh token
   */
  static async refreshAccessToken(
    refreshToken: string,
    clientId: string,
    clientSecret: string
  ): Promise<{ accessToken: string; expiresAt: number }> {
    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Token refresh failed: ${error.error_description || error.error}`);
    }

    const data = await response.json();

    return {
      accessToken: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };
  }

  /**
   * Get user email from Google
   */
  static async getUserEmail(accessToken: string): Promise<string> {
    const response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to get user info");
    }

    const data = await response.json();
    return data.email;
  }

  /**
   * Load configuration from Firestore
   */
  async loadConfig(): Promise<GoogleDriveConfig | null> {
    if (!db) return null;

    try {
      const docRef = doc(db, COLLECTIONS.BACKUP_STORAGE_PROVIDERS, GOOGLE_DRIVE_CONFIG_ID);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        this.config = docSnap.data() as GoogleDriveConfig;
        return this.config;
      }

      return null;
    } catch (error) {
      console.error("Error loading Google Drive config:", error);
      return null;
    }
  }

  /**
   * Save configuration to Firestore
   */
  async saveConfig(config: Partial<GoogleDriveConfig>): Promise<void> {
    if (!db) throw new Error("Database not initialized");

    const now = Timestamp.now();
    const existingConfig = await this.loadConfig();

    const newConfig: GoogleDriveConfig = {
      id: GOOGLE_DRIVE_CONFIG_ID,
      name: "Google Drive",
      enabled: true,
      connected: false,
      createdAt: existingConfig?.createdAt || now,
      updatedAt: now,
      ...existingConfig,
      ...config,
    };

    await setDoc(
      doc(db, COLLECTIONS.BACKUP_STORAGE_PROVIDERS, GOOGLE_DRIVE_CONFIG_ID),
      newConfig
    );

    this.config = newConfig;
  }

  /**
   * Check if token needs refresh
   */
  private isTokenExpired(): boolean {
    if (!this.config?.credentials) return true;
    // Refresh 5 minutes before expiry
    return Date.now() > this.config.credentials.expiresAt - 5 * 60 * 1000;
  }

  /**
   * Get valid access token (refresh if needed)
   */
  async getAccessToken(clientId: string, clientSecret: string): Promise<string> {
    if (!this.config?.credentials) {
      throw new Error("Google Drive not connected");
    }

    if (this.isTokenExpired()) {
      const { accessToken, expiresAt } = await GoogleDriveProvider.refreshAccessToken(
        this.config.credentials.refreshToken,
        clientId,
        clientSecret
      );

      await this.saveConfig({
        credentials: {
          ...this.config.credentials,
          accessToken,
          expiresAt,
        },
      });

      return accessToken;
    }

    return this.config.credentials.accessToken;
  }

  /**
   * Create or get backup folder in Google Drive
   */
  async getOrCreateBackupFolder(accessToken: string): Promise<string> {
    // Check if we already have a folder ID
    if (this.config?.folderId) {
      // Verify folder still exists
      try {
        const response = await fetch(
          `${GOOGLE_DRIVE_API}/files/${this.config.folderId}?fields=id,name,trashed`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );

        if (response.ok) {
          const folder = await response.json();
          if (!folder.trashed) {
            return this.config.folderId;
          }
        }
      } catch {
        // Folder doesn't exist, create new one
      }
    }

    // Search for existing folder
    const searchResponse = await fetch(
      `${GOOGLE_DRIVE_API}/files?q=${encodeURIComponent(
        `name='${BACKUP_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
      )}&fields=files(id,name)`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (searchResponse.ok) {
      const searchData = await searchResponse.json();
      if (searchData.files && searchData.files.length > 0) {
        const folderId = searchData.files[0].id;
        await this.saveConfig({ folderId, folderName: BACKUP_FOLDER_NAME });
        return folderId;
      }
    }

    // Create new folder
    const createResponse = await fetch(`${GOOGLE_DRIVE_API}/files`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: BACKUP_FOLDER_NAME,
        mimeType: "application/vnd.google-apps.folder",
      }),
    });

    if (!createResponse.ok) {
      throw new Error("Failed to create backup folder in Google Drive");
    }

    const folder = await createResponse.json();
    await this.saveConfig({ folderId: folder.id, folderName: BACKUP_FOLDER_NAME });
    return folder.id;
  }

  /**
   * Upload file to Google Drive
   */
  async uploadFile(
    accessToken: string,
    fileName: string,
    content: string | Blob,
    mimeType: string = "application/json"
  ): Promise<DriveFile> {
    const folderId = await this.getOrCreateBackupFolder(accessToken);

    // Create file metadata
    const metadata = {
      name: fileName,
      parents: [folderId],
    };

    // Create multipart request
    const boundary = "backup_boundary_" + Date.now();
    const contentBlob = typeof content === "string" ? new Blob([content], { type: mimeType }) : content;

    const body = new FormData();
    body.append(
      "metadata",
      new Blob([JSON.stringify(metadata)], { type: "application/json" })
    );
    body.append("file", contentBlob);

    const response = await fetch(
      `${GOOGLE_UPLOAD_API}/files?uploadType=multipart&fields=id,name,size,createdTime,webViewLink,webContentLink`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body,
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Upload failed: ${error.error?.message || "Unknown error"}`);
    }

    const file = await response.json();

    // Update last sync time
    await this.saveConfig({ lastSyncAt: Timestamp.now() });

    return file;
  }

  /**
   * List files in backup folder
   */
  async listFiles(accessToken: string): Promise<DriveFile[]> {
    const folderId = await this.getOrCreateBackupFolder(accessToken);

    const response = await fetch(
      `${GOOGLE_DRIVE_API}/files?q=${encodeURIComponent(
        `'${folderId}' in parents and trashed=false`
      )}&fields=files(id,name,mimeType,size,createdTime,modifiedTime,webViewLink,webContentLink)&orderBy=createdTime desc`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to list files");
    }

    const data = await response.json();
    return data.files || [];
  }

  /**
   * Download file from Google Drive
   */
  async downloadFile(accessToken: string, fileId: string): Promise<string> {
    const response = await fetch(
      `${GOOGLE_DRIVE_API}/files/${fileId}?alt=media`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to download file");
    }

    return response.text();
  }

  /**
   * Delete file from Google Drive
   */
  async deleteFile(accessToken: string, fileId: string): Promise<void> {
    const response = await fetch(`${GOOGLE_DRIVE_API}/files/${fileId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new Error("Failed to delete file");
    }
  }

  /**
   * Get storage quota info
   */
  async getStorageQuota(accessToken: string): Promise<{
    limit: number;
    usage: number;
    usageInDrive: number;
  }> {
    const response = await fetch(
      `${GOOGLE_DRIVE_API}/about?fields=storageQuota`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to get storage quota");
    }

    const data = await response.json();
    return {
      limit: parseInt(data.storageQuota.limit || "0"),
      usage: parseInt(data.storageQuota.usage || "0"),
      usageInDrive: parseInt(data.storageQuota.usageInDrive || "0"),
    };
  }

  /**
   * Disconnect Google Drive
   */
  async disconnect(): Promise<void> {
    await this.saveConfig({
      credentials: undefined,
      folderId: undefined,
      folderName: undefined,
      email: undefined,
      connected: false,
    });
  }
}

// Export singleton instance
export const googleDriveProvider = new GoogleDriveProvider();
