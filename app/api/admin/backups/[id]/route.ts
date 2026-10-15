/**
 * Single Backup API Routes
 * GET /api/admin/backups/:id - Get backup details
 * DELETE /api/admin/backups/:id - Delete backup
 */

import { NextRequest, NextResponse } from "next/server";
import { backupService } from "@/lib/services/backup-service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const backup = await backupService.getBackup(id);

    if (!backup) {
      return NextResponse.json(
        { success: false, error: "Backup not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      backup,
    });
  } catch (error) {
    console.error("Error fetching backup:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await backupService.deleteBackup(id);

    return NextResponse.json({
      success: true,
      message: "Backup deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting backup:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
