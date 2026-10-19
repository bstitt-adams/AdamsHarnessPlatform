import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { ApiAuthError, requireAdmin, authErrorResponse } from "@/lib/auth/server-auth";
import { COLLECTIONS } from "@/lib/schema";

type SyncSource = {
  key: string;
  category: "certification" | "vehicle_inspection" | "asset_warranty" | "project_milestone" | "safety_deadline" | "automation";
  title: string;
  description: string;
  dueDate: Date;
  attendee?: string;
  location?: string;
};

function parseDate(value: unknown): Date | null {
  if (!value) return null;
  if (typeof value === "object" && value && "toDate" in value && typeof value.toDate === "function") return value.toDate();
  const date = new Date(String(value).length === 10 ? `${value}T09:00:00` : String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

function daysFrom(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  result.setHours(9, 0, 0, 0);
  return result;
}

function eventId(sourceKey: string, offset: number) {
  return `managed-${createHash("sha1").update(`${sourceKey}:${offset}`).digest("hex").slice(0, 24)}`;
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);
    if (!adminDb) return NextResponse.json({ error: "Database service unavailable" }, { status: 503 });

    const [certSnap, assetSnap, moduleSnap, projectSnap, safetySnap, automationSnap, calendarSnap] = await Promise.all([
      adminDb.collection(COLLECTIONS.USER_TRAINING_CERTS).get(),
      adminDb.collection(COLLECTIONS.USER_ASSETS).get(),
      adminDb.collection(COLLECTIONS.MODULE_RECORDS).get(),
      adminDb.collectionGroup("milestones").get(),
      adminDb.collection(COLLECTIONS.SITECALENDARITEMS).get(),
      adminDb.collection(COLLECTIONS.PLATFORM_AUTOMATIONS).get(),
      adminDb.collection(COLLECTIONS.CALENDAR_EVENTS).get(),
    ]);

    const sources: SyncSource[] = [];
    certSnap.forEach((item) => {
      const data = item.data();
      const dueDate = parseDate(data.expirationDate);
      if (dueDate) sources.push({ key: `certification:${item.id}`, category: "certification", title: `${data.trainingTitle || "Certification"} — ${data.userName || "Team Member"}`, description: `Certification renewal · ${data.issuingOrganization || "Adams Electric"}`, dueDate, attendee: data.userName, location: data.issuingOrganization });
    });
    assetSnap.forEach((item) => {
      const data = item.data();
      const warrantyDate = parseDate(data.warrantyExpiration);
      if (warrantyDate) sources.push({ key: `asset-warranty:${item.id}`, category: "asset_warranty", title: `Warranty: ${data.assetName || data.assetTag || "Asset"}`, description: `Warranty expiration · Assigned to ${data.assignedToName || "Unassigned"}`, dueDate: warrantyDate, attendee: data.assignedToName });
      const inspectionDate = parseDate(data.nextInspectionDate);
      if (inspectionDate && String(data.assetType || "").toLowerCase().match(/vehicle|truck|van/)) sources.push({ key: `asset-inspection:${item.id}`, category: "vehicle_inspection", title: `Vehicle Inspection: ${data.assetName || data.assetTag || data.identifier || "Vehicle"}`, description: `Inspection due · Assigned to ${data.assignedToName || "Unassigned"}`, dueDate: inspectionDate, attendee: data.assignedToName });
    });
    moduleSnap.forEach((item) => {
      const record = item.data();
      if (!String(record.moduleSlug || "").includes("vehicle-inspection") && !String(record.recordTypeId || "").includes("vehicle")) return;
      const data = record.data || {};
      const dueDate = parseDate(data.next_inspection_due || data.due_date || record.dueAt);
      if (dueDate) sources.push({ key: `module-inspection:${item.id}`, category: "vehicle_inspection", title: `Vehicle Inspection: ${data.license_plate || data.vehicle_number || data.vin || "Vehicle"}`, description: `Six-month vehicle inspection · Driver ${data.driver_name || data.assigned_driver_name || data.assigned_driver_id || "Unassigned"}`, dueDate, attendee: data.driver_name || data.assigned_driver_name });
    });
    projectSnap.forEach((item) => {
      const data = item.data();
      const dueDate = parseDate(data.dueDate);
      if (dueDate && !data.completed) sources.push({ key: `project-milestone:${item.ref.parent.parent?.id || "project"}:${item.id}`, category: "project_milestone", title: `Project Milestone: ${data.title || data.name || "Milestone"}`, description: data.description || "Project milestone deadline", dueDate });
    });
    safetySnap.forEach((item) => {
      const data = item.data();
      const dueDate = parseDate(data.date);
      if (dueDate) sources.push({ key: `safety-deadline:${item.id}`, category: "safety_deadline", title: `Safety: ${data.title || "Safety deadline"}`, description: data.description || "Safety calendar deadline", dueDate, attendee: data.assignee, location: data.location });
    });
    automationSnap.forEach((item) => {
      const data = item.data();
      const dueDate = parseDate(data.nextRunAt);
      if (dueDate && data.status === "active") sources.push({ key: `automation:${item.id}`, category: "automation", title: `Automation: ${data.name || "Scheduled workflow"}`, description: data.prompt || data.schedule || "Scheduled automation", dueDate });
    });

    const now = new Date(); now.setHours(0, 0, 0, 0);
    const windowEnd = daysFrom(now, 90);
    const overdueStart = daysFrom(now, -30);
    const desired = new Map<string, Record<string, unknown>>();
    const colors: Record<SyncSource["category"], string> = { certification: "#f59e0b", vehicle_inspection: "#ef4444", asset_warranty: "#8b5cf6", project_milestone: "#2563eb", safety_deadline: "#dc2626", automation: "#0ea5e9" };

    for (const source of sources) {
      if (source.dueDate < overdueStart || source.dueDate > windowEnd) continue;
      const offsets = source.dueDate < now ? [0] : [90, 60, 30, 7, 0];
      for (const offset of offsets) {
        const start = daysFrom(source.dueDate, -offset);
        if (start < now && offset !== 0) continue;
        const id = eventId(source.key, offset);
        desired.set(id, { title: offset ? `${offset}-Day Reminder: ${source.title}` : `Due: ${source.title}`, description: `${source.description}${offset ? ` · Due ${source.dueDate.toLocaleDateString("en-US")}` : ""}`, startDate: start, endDate: new Date(start.getTime() + 3600000), allDay: true, type: source.category === "certification" ? "training" : "automation", color: colors[source.category], attendees: source.attendee ? [source.attendee] : [], location: source.location || "Adams Electric", managedCalendarSync: true, managedSourceKey: source.key, managedSourceCategory: source.category, managedDueDate: source.dueDate.toISOString().slice(0, 10), managedReminderDays: offset, ...(source.category === "certification" ? { trainingCertId: source.key.replace("certification:", "") } : {}), updatedAt: new Date() });
      }
    }

    const batch = adminDb.batch();
    let deleted = 0;
    calendarSnap.forEach((item) => {
      const data = item.data();
      const staleManaged = data.managedCalendarSync === true && !desired.has(item.id);
      const legacyCertificationExpiration = Boolean(data.trainingCertId) && String(data.title || "").startsWith("Cert Expires:") && data.managedCalendarSync !== true;
      if (staleManaged || legacyCertificationExpiration) { batch.delete(item.ref); deleted++; }
    });
    for (const [id, data] of desired) batch.set(adminDb.collection(COLLECTIONS.CALENDAR_EVENTS).doc(id), { ...data, createdAt: new Date() }, { merge: true });
    await batch.commit();
    return NextResponse.json({ success: true, sourceCount: sources.length, eventCount: desired.size, deleted });
  } catch (error) {
    if (error instanceof ApiAuthError) return authErrorResponse(error);
    console.error("Compliance calendar sync failed:", error);
    return NextResponse.json({ error: "Compliance calendar sync failed" }, { status: 500 });
  }
}
