import { NextRequest, NextResponse } from "next/server";
import { ApiAuthError, authErrorResponse, requireUser } from "@/lib/auth/server-auth";
import { adminDb } from "@/lib/firebase-admin";
import { httpErrorResponse } from "@/lib/adams-harness/server-store";
import { isSafetyActor } from "@/lib/safety/access";
import { COLLECTIONS, type TeamMemberDoc, type VehicleInspectionDoc } from "@/lib/schema";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { DAILY_CHECKLIST_ITEMS } from "@/lib/safety/vehicle-checklist";

const REQUIRED_ITEM_IDS = DAILY_CHECKLIST_ITEMS.map((item) => item.id);

const createSchema = z.object({
  vehicleNumber: z.string().min(1).max(50),
  vinOrPlate: z.string().max(50).optional(),
  mileage: z.number().int().min(0).optional(),
  checklist: z.record(z.string(), z.enum(["pass", "fail", "na"])),
  defectNotes: z.string().max(4000).optional(),
  photoPaths: z.array(z.string()).max(10).optional(),
  outOfService: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const actor = await requireUser(request);
    if (!adminDb) return NextResponse.json({ error: "Database service unavailable" }, { status: 503 });
    const parsed = createSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
    }
    const body = parsed.data;

    const missing = REQUIRED_ITEM_IDS.filter((id) => !body.checklist[id]);
    if (missing.length) {
      return NextResponse.json({ error: `Checklist items missing: ${missing.join(", ")}` }, { status: 400 });
    }

    let driverName = actor.email;
    if (actor.teamMemberId) {
      const memberSnap = await adminDb.collection(COLLECTIONS.TEAM_MEMBERS).doc(actor.teamMemberId).get();
      if (memberSnap.exists) {
        const member = memberSnap.data() as TeamMemberDoc;
        driverName = `${member.firstName} ${member.lastName}`.trim() || actor.email;
      }
    }

    const hasFail = Object.values(body.checklist).includes("fail");
    const outcome: VehicleInspectionDoc["outcome"] = body.outOfService ? "out_of_service" : hasFail ? "defects" : "passed";

    const ref = adminDb.collection(COLLECTIONS.VEHICLE_INSPECTIONS).doc();
    await ref.set({
      id: ref.id,
      vehicleNumber: body.vehicleNumber,
      ...(body.vinOrPlate ? { vinOrPlate: body.vinOrPlate } : {}),
      ...(body.mileage !== undefined ? { mileage: body.mileage } : {}),
      driverUid: actor.uid,
      driverName,
      checklist: body.checklist,
      ...(body.defectNotes ? { defectNotes: body.defectNotes } : {}),
      photoPaths: body.photoPaths || [],
      outcome,
      createdAt: FieldValue.serverTimestamp(),
    });
    return NextResponse.json({ id: ref.id, outcome });
  } catch (error) {
    if (error instanceof ApiAuthError) return authErrorResponse(error);
    const http = httpErrorResponse(error);
    if (http) return http;
    console.error("Vehicle inspection create failed:", error);
    return NextResponse.json({ error: "Failed to submit inspection" }, { status: 500 });
  }
}

/** List inspections: Safety/admin see all, drivers see their own. Optional ?vehicleNumber= filter. */
export async function GET(request: NextRequest) {
  try {
    const actor = await requireUser(request);
    if (!adminDb) return NextResponse.json({ error: "Database service unavailable" }, { status: 503 });
    const safety = await isSafetyActor(actor);
    const vehicleNumber = request.nextUrl.searchParams.get("vehicleNumber");

    const collection = adminDb.collection(COLLECTIONS.VEHICLE_INSPECTIONS);
    let snap: FirebaseFirestore.QuerySnapshot;
    if (vehicleNumber) {
      snap = await collection.where("vehicleNumber", "==", vehicleNumber).orderBy("createdAt", "desc").limit(100).get();
    } else if (safety) {
      snap = await collection.orderBy("createdAt", "desc").limit(300).get();
    } else {
      snap = await collection.where("driverUid", "==", actor.uid).orderBy("createdAt", "desc").limit(100).get();
    }
    const inspections = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    // Non-Safety drivers can only see their own records even when filtering by vehicle.
    const visible = safety ? inspections : inspections.filter((i) => (i as { driverUid?: string }).driverUid === actor.uid);
    return NextResponse.json({ inspections: visible, safety });
  } catch (error) {
    if (error instanceof ApiAuthError) return authErrorResponse(error);
    const http = httpErrorResponse(error);
    if (http) return http;
    console.error("Vehicle inspection list failed:", error);
    return NextResponse.json({ error: "Failed to load inspections" }, { status: 500 });
  }
}
