/**
 * Backup Schedules API Routes
 * GET - List all schedules
 * POST - Create new schedule
 */

import { NextRequest, NextResponse } from "next/server";
import { backupScheduler, type ScheduleConfig } from "@/lib/services/backup-scheduler";

export async function GET(request: NextRequest) {
  try {
    const schedules = await backupScheduler.listSchedules();

    return NextResponse.json({
      success: true,
      schedules,
    });
  } catch (error) {
    console.error("Error listing schedules:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const config: ScheduleConfig = {
      name: body.name,
      description: body.description,
      frequency: body.frequency || "daily",
      cronExpression: body.cronExpression,
      time: body.time || "02:00",
      dayOfWeek: body.dayOfWeek,
      dayOfMonth: body.dayOfMonth,
      timezone: body.timezone || "America/New_York",
      backupType: body.backupType || "full",
      collections: body.collections,
      storageProviders: body.storageProviders || ["google-drive"],
      retentionPolicy: body.retentionPolicy || {
        keepLast: 10,
        keepDailyFor: 7,
        keepWeeklyFor: 4,
        keepMonthlyFor: 3,
      },
      notifications: body.notifications || {
        onSuccess: false,
        onFailure: true,
        emails: [],
      },
    };

    const scheduleId = await backupScheduler.createSchedule(
      config,
      body.createdBy || "system"
    );

    return NextResponse.json({
      success: true,
      scheduleId,
    });
  } catch (error) {
    console.error("Error creating schedule:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
