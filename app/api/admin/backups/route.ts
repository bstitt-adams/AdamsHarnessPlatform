import { NextRequest, NextResponse } from "next/server";
import { authErrorResponse, requireAdmin } from "@/lib/auth/server-auth";
import { adminDb } from "@/lib/firebase-admin";
import { createServerBackup, type ServerBackupConfig } from "@/lib/services/server-backup-service";
import { COLLECTIONS, type BackupMetadataDoc } from "@/lib/schema";

function serializeTimestamp(value: unknown) {
  return typeof (value as { toDate?: unknown })?.toDate === "function"
    ? (value as { toDate: () => Date }).toDate().toISOString()
    : value;
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);
    const body = await request.json();
    const config: ServerBackupConfig = {
      type: body.type || "full",
      collections: body.collections,
      compression: body.compression || "none",
      encryption: body.encryption || false,
      storageProviders: body.storageProviders || ["google-drive"],
      triggeredBy: "manual",
    };
    const backup = await createServerBackup(config);
    return NextResponse.json({ success: true, backup: { ...backup, createdAt: serializeTimestamp(backup.createdAt), completedAt: serializeTimestamp(backup.completedAt) } });
  } catch (error) {
    const authError = authErrorResponse(error);
    if (authError) return authError;
    console.error("Backup creation error:", error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    if (!adminDb) return NextResponse.json({ success: false, error: "Firebase Admin is not configured" }, { status: 503 });
    const limit = Math.min(Number(request.nextUrl.searchParams.get("limit") || 50), 100);
    const snapshot = await adminDb.collection(COLLECTIONS.BACKUP_METADATA).orderBy("createdAt", "desc").limit(limit).get();
    const backups = snapshot.docs.map((docSnap) => {
      const backup = docSnap.data() as BackupMetadataDoc;
      return { ...backup, createdAt: serializeTimestamp(backup.createdAt), completedAt: serializeTimestamp(backup.completedAt) };
    });
    return NextResponse.json({ success: true, backups });
  } catch (error) {
    const authError = authErrorResponse(error);
    if (authError) return authError;
    console.error("Error listing backups:", error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
