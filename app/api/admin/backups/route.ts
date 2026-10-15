/**
 * Backup API Routes
 * POST /api/admin/backups - Create new backup
 * GET /api/admin/backups - List all backups
 */

import { NextRequest, NextResponse } from "next/server";
import { backupService, type BackupConfig } from "@/lib/services/backup-service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const config: BackupConfig = {
      type: body.type || "full",
      collections: body.collections,
      compression: body.compression || "none",
      encryption: body.encryption || false,
      storageProviders: body.storageProviders,
    };

    const result = await backupService.createBackup(config);

    return NextResponse.json({
      success: true,
      backup: result,
    });
  } catch (error) {
    console.error("Backup creation error:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");

    const backups = await backupService.listBackups(limit);

    return NextResponse.json({
      success: true,
      backups,
    });
  } catch (error) {
    console.error("Error listing backups:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
