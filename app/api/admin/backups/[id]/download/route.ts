import { NextRequest, NextResponse } from "next/server";
import { authErrorResponse, requireAdmin } from "@/lib/auth/server-auth";
import { adminDb } from "@/lib/firebase-admin";
import { googleDriveProvider } from "@/lib/services/storage-providers/google-drive-provider";
import { COLLECTIONS, type BackupMetadataDoc } from "@/lib/schema";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request);
    if (!adminDb) return NextResponse.json({ error: "Firebase Admin is not configured" }, { status: 503 });
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      return NextResponse.json({ error: "Google OAuth is not configured" }, { status: 503 });
    }

    const { id } = await params;
    const snap = await adminDb.collection(COLLECTIONS.BACKUP_METADATA).doc(id).get();
    if (!snap.exists) return NextResponse.json({ error: "Backup not found" }, { status: 404 });

    const backup = snap.data() as BackupMetadataDoc;
    const driveLocation = backup.storageLocations?.find((location) => location.provider === "google-drive");
    if (!driveLocation?.path) {
      return NextResponse.json(
        { error: "This backup does not have Google Drive backup data. Create a new backup after connecting Google Drive." },
        { status: 409 },
      );
    }

    const config = await googleDriveProvider.loadConfig();
    if (!config?.connected || !config.credentials) {
      return NextResponse.json({ error: "Google Drive is not connected" }, { status: 409 });
    }

    const accessToken = await googleDriveProvider.getAccessToken(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
    const content = await googleDriveProvider.downloadFile(accessToken, driveLocation.path);
    return new NextResponse(content, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${id}.json"`,
      },
    });
  } catch (error) {
    const authError = authErrorResponse(error);
    if (authError) return authError;
    console.error("Backup download error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
