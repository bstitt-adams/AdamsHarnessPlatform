import { NextRequest, NextResponse } from "next/server";
import { authErrorResponse, requireAdmin } from "@/lib/auth/server-auth";
import { adminDb } from "@/lib/firebase-admin";
import { googleDriveProvider } from "@/lib/services/storage-providers/google-drive-provider";
import { COLLECTIONS, type BackupMetadataDoc } from "@/lib/schema";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";

function serialize(backup: BackupMetadataDoc) {
  return {
    ...backup,
    createdAt: backup.createdAt?.toDate?.()?.toISOString(),
    completedAt: backup.completedAt?.toDate?.()?.toISOString(),
  };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request);
    if (!adminDb) return NextResponse.json({ success: false, error: "Firebase Admin is not configured" }, { status: 503 });
    const { id } = await params;
    const snap = await adminDb.collection(COLLECTIONS.BACKUP_METADATA).doc(id).get();
    if (!snap.exists) return NextResponse.json({ success: false, error: "Backup not found" }, { status: 404 });
    return NextResponse.json({ success: true, backup: serialize(snap.data() as BackupMetadataDoc) });
  } catch (error) {
    const authError = authErrorResponse(error);
    if (authError) return authError;
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request);
    if (!adminDb) return NextResponse.json({ success: false, error: "Firebase Admin is not configured" }, { status: 503 });
    const { id } = await params;
    const ref = adminDb.collection(COLLECTIONS.BACKUP_METADATA).doc(id);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ success: false, error: "Backup not found" }, { status: 404 });

    const backup = snap.data() as BackupMetadataDoc;
    const driveLocation = backup.storageLocations?.find((location) => location.provider === "google-drive");
    if (driveLocation?.path && GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
      try {
        const accessToken = await googleDriveProvider.getAccessToken(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
        await googleDriveProvider.deleteFile(accessToken, driveLocation.path);
      } catch (error) {
        console.error("Failed to delete Google Drive backup file:", error);
      }
    }

    await ref.delete();
    return NextResponse.json({ success: true, message: "Backup deleted successfully" });
  } catch (error) {
    const authError = authErrorResponse(error);
    if (authError) return authError;
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
