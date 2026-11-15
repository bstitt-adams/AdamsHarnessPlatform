import { NextRequest, NextResponse } from "next/server";
import { ApiAuthError, authErrorResponse, requireUser } from "@/lib/auth/server-auth";
import { adminDb } from "@/lib/firebase-admin";
import { httpErrorResponse } from "@/lib/adams-harness/server-store";
import { writeHardhatQrEvent } from "@/lib/hardhat-qr";
import { COLLECTIONS, type HardhatQrCodeDoc, type TeamMemberDoc } from "@/lib/schema";

/**
 * Safety-gated worker lookup by QR token. Returns emergency contacts and
 * photo — visible only to admins or members of the Safety department.
 * Every successful read is logged as `emergency_contact_viewed`.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireUser(request);
    if (!adminDb) return NextResponse.json({ error: "Database service unavailable" }, { status: 503 });
    const { id } = await params;

    // Safety gate: admin/superadmin OR member of the Safety department
    let member: TeamMemberDoc | null = null;
    if (actor.teamMemberId) {
      const snap = await adminDb.collection(COLLECTIONS.TEAM_MEMBERS).doc(actor.teamMemberId).get();
      if (snap.exists) member = { id: snap.id, ...snap.data() } as TeamMemberDoc;
    }
    const isSafety =
      actor.role === "admin" ||
      actor.role === "superadmin" ||
      member?.workforceDepartmentName === "Safety";
    if (!isSafety) {
      return NextResponse.json({ error: "Safety personnel access required" }, { status: 403 });
    }

    const codeSnap = await adminDb.collection(COLLECTIONS.HARDHAT_QR_CODES).doc(id).get();
    if (!codeSnap.exists) {
      return NextResponse.json({ error: "Invalid QR code" }, { status: 404 });
    }
    const code = { id: codeSnap.id, ...codeSnap.data() } as HardhatQrCodeDoc;
    if (code.status !== "active") {
      return NextResponse.json({ error: "QR code is not active" }, { status: 410 });
    }

    const workerSnap = await adminDb.collection(COLLECTIONS.TEAM_MEMBERS).doc(code.teamMemberId).get();
    if (!workerSnap.exists) {
      return NextResponse.json({ error: "Team member not found" }, { status: 404 });
    }
    const worker = { id: workerSnap.id, ...workerSnap.data() } as TeamMemberDoc;

    await writeHardhatQrEvent(code, "emergency_contact_viewed", {
      actor: { uid: actor.uid, email: actor.email },
      actorType: "admin",
      ipHash: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined,
      userAgent: request.headers.get("user-agent") || undefined,
    });

    return NextResponse.json({
      worker: {
        id: worker.id,
        name: `${worker.firstName} ${worker.lastName}`.trim(),
        title: worker.title || worker.jobTitleRaw || "",
        department: worker.workforceDepartmentName || "",
        photoPath: worker.photoPath || null,
        emergencyContacts: worker.emergencyContacts || [],
      },
    });
  } catch (error) {
    if (error instanceof ApiAuthError) return authErrorResponse(error);
    const http = httpErrorResponse(error);
    if (http) return http;
    console.error("Safety worker lookup failed:", error);
    return NextResponse.json({ error: "Safety worker lookup failed" }, { status: 500 });
  }
}
