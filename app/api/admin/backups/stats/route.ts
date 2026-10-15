/**
 * Backup Stats API Route
 * GET /api/admin/backups/stats - Get backup statistics
 */

import { NextRequest, NextResponse } from "next/server";
import { backupService } from "@/lib/services/backup-service";

export async function GET(request: NextRequest) {
  try {
    const stats = await backupService.getBackupStats();

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("Error fetching backup stats:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
