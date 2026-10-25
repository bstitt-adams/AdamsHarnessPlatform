import { NextRequest, NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { authErrorResponse, requireAdmin } from "@/lib/auth/server-auth";
import { adminDb } from "@/lib/firebase-admin";
import { generateCronExpression, getNextRunTime, type ScheduleConfig } from "@/lib/services/backup-scheduler";
import { COLLECTIONS, type BackupScheduleDoc } from "@/lib/schema";

function serialize(value: unknown) {
  return typeof (value as { toDate?: unknown })?.toDate === "function"
    ? (value as { toDate: () => Date }).toDate().toISOString()
    : value;
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    if (!adminDb) return NextResponse.json({ success: false, error: "Firebase Admin is not configured" }, { status: 503 });
    const snapshot = await adminDb.collection(COLLECTIONS.BACKUP_SCHEDULES).orderBy("createdAt", "desc").get();
    return NextResponse.json({
      success: true,
      schedules: snapshot.docs.map((docSnap) => {
        const schedule = docSnap.data() as BackupScheduleDoc;
        return { ...schedule, nextRunAt: serialize(schedule.nextRunAt), lastRunAt: serialize(schedule.lastRunAt), createdAt: serialize(schedule.createdAt), updatedAt: serialize(schedule.updatedAt) };
      }),
    });
  } catch (error) {
    const authError = authErrorResponse(error);
    if (authError) return authError;
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireAdmin(request);
    if (!adminDb) return NextResponse.json({ success: false, error: "Firebase Admin is not configured" }, { status: 503 });
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
      retentionPolicy: body.retentionPolicy || { keepLast: 10, keepDailyFor: 7, keepWeeklyFor: 4, keepMonthlyFor: 3 },
      notifications: body.notifications || { onSuccess: false, onFailure: true, emails: [] },
    };
    const scheduleId = `schedule-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const cronExpression = generateCronExpression(config);
    const schedule: BackupScheduleDoc = {
      id: scheduleId,
      name: config.name,
      ...(config.description ? { description: config.description } : {}),
      cronExpression,
      timezone: config.timezone,
      enabled: true,
      backupType: config.backupType,
      ...(config.collections ? { collections: config.collections } : {}),
      storageProviders: config.storageProviders,
      compression: "gzip",
      encryption: false,
      retentionPolicy: config.retentionPolicy,
      notifications: config.notifications,
      nextRunAt: Timestamp.fromDate(getNextRunTime(cronExpression, config.timezone)) as BackupScheduleDoc["nextRunAt"],
      createdAt: Timestamp.now() as BackupScheduleDoc["createdAt"],
      updatedAt: Timestamp.now() as BackupScheduleDoc["updatedAt"],
      createdBy: actor.email || actor.uid,
    };
    await adminDb.collection(COLLECTIONS.BACKUP_SCHEDULES).doc(scheduleId).set(schedule);
    return NextResponse.json({ success: true, scheduleId });
  } catch (error) {
    const authError = authErrorResponse(error);
    if (authError) return authError;
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
