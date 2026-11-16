/**
 * Backup Stats API Route
 * GET /api/admin/backups/stats - Get backup statistics
 */

import { NextRequest, NextResponse } from "next/server";
import { authErrorResponse, requireAdmin } from "@/lib/auth/server-auth";
import { adminDb } from "@/lib/firebase-admin";
import { COLLECTIONS } from "@/lib/schema";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    if (!adminDb) {
      return NextResponse.json({ success: false, error: "Database service unavailable" }, { status: 503 });
    }
    // Admin SDK: the browser SDK has no auth context on the server and is denied by rules.
    const snap = await adminDb.collection(COLLECTIONS.BACKUP_METADATA).orderBy("createdAt", "desc").limit(100).get();
    const backups = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as { id: string; size?: number; status?: string; createdAt?: { toDate?: () => Date } });
    const successCount = backups.filter((b) => b.status === "success").length;
    const last = backups[0];

    return NextResponse.json({
      success: true,
      stats: {
        totalBackups: backups.length,
        lastBackup: last ? { ...last, createdAt: last.createdAt?.toDate?.()?.toISOString() ?? null } : null,
        totalSize: backups.reduce((sum, b) => sum + (b.size || 0), 0),
        successRate: backups.length > 0 ? (successCount / backups.length) * 100 : 0,
      },
    });
  } catch (error) {
    const authError = authErrorResponse(error);
    if (authError) return authError;
    console.error("Error fetching backup stats:", error);
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
