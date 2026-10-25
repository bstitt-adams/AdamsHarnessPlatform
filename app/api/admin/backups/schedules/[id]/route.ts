import { NextRequest, NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { authErrorResponse, requireAdmin } from "@/lib/auth/server-auth";
import { adminDb } from "@/lib/firebase-admin";
import { getNextRunTime } from "@/lib/services/backup-scheduler";
import { COLLECTIONS, type BackupScheduleDoc } from "@/lib/schema";

function serialize(schedule: BackupScheduleDoc) {
  const convert = (value: unknown) => typeof (value as { toDate?: unknown })?.toDate === "function"
    ? (value as { toDate: () => Date }).toDate().toISOString()
    : value;
  return { ...schedule, nextRunAt: convert(schedule.nextRunAt), lastRunAt: convert(schedule.lastRunAt), createdAt: convert(schedule.createdAt), updatedAt: convert(schedule.updatedAt) };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request);
    if (!adminDb) return NextResponse.json({ success: false, error: "Firebase Admin is not configured" }, { status: 503 });
    const { id } = await params;
    const snap = await adminDb.collection(COLLECTIONS.BACKUP_SCHEDULES).doc(id).get();
    if (!snap.exists) return NextResponse.json({ success: false, error: "Schedule not found" }, { status: 404 });
    return NextResponse.json({ success: true, schedule: serialize(snap.data() as BackupScheduleDoc) });
  } catch (error) {
    const authError = authErrorResponse(error);
    if (authError) return authError;
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request);
    if (!adminDb) return NextResponse.json({ success: false, error: "Firebase Admin is not configured" }, { status: 503 });
    const { id } = await params;
    const body = await request.json();
    const ref = adminDb.collection(COLLECTIONS.BACKUP_SCHEDULES).doc(id);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ success: false, error: "Schedule not found" }, { status: 404 });
    const schedule = snap.data() as BackupScheduleDoc;

    if (body.action === "toggle") {
      const enabled = Boolean(body.enabled);
      await ref.update({
        enabled,
        updatedAt: Timestamp.now(),
        ...(enabled ? { nextRunAt: Timestamp.fromDate(getNextRunTime(schedule.cronExpression, schedule.timezone)) } : {}),
      });
      return NextResponse.json({ success: true, message: enabled ? "Schedule enabled" : "Schedule disabled" });
    }

    const allowed = ["name", "description", "backupType", "collections", "storageProviders", "retentionPolicy", "notifications", "timezone"];
    const updates = Object.fromEntries(Object.entries(body).filter(([key, value]) => allowed.includes(key) && value !== undefined));
    await ref.update({ ...updates, updatedAt: Timestamp.now() });
    return NextResponse.json({ success: true, message: "Schedule updated" });
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
    await adminDb.collection(COLLECTIONS.BACKUP_SCHEDULES).doc(id).delete();
    return NextResponse.json({ success: true, message: "Schedule deleted" });
  } catch (error) {
    const authError = authErrorResponse(error);
    if (authError) return authError;
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
