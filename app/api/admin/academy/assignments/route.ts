import { NextRequest, NextResponse } from "next/server";
import { ApiAuthError, authErrorResponse, requireAdmin } from "@/lib/auth/server-auth";
import { adminDb } from "@/lib/firebase-admin";
import { httpErrorResponse } from "@/lib/adams-harness/server-store";
import { COLLECTIONS, type TeamMemberDoc } from "@/lib/schema";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { z } from "zod";

const assignmentSchema = z.object({
  courseId: z.string().min(1),
  teamMemberIds: z.array(z.string().min(1)).min(1),
  dueDate: z.string().optional(),
});

const LMS_ENROLLMENTS = "lms_enrollments";
const LMS_COURSES = "lms_courses";
const LMS_ASSIGNMENTS = "lms_assignments";

/** List course assignments (admin). */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    if (!adminDb) return NextResponse.json({ error: "Database service unavailable" }, { status: 503 });
    const courseId = request.nextUrl.searchParams.get("courseId");
    let q: FirebaseFirestore.Query = adminDb.collection(LMS_ASSIGNMENTS).orderBy("assignedAt", "desc").limit(200);
    if (courseId) q = adminDb.collection(LMS_ASSIGNMENTS).where("courseId", "==", courseId).limit(200);
    const snap = await q.get();
    return NextResponse.json({ assignments: snap.docs.map((d) => ({ id: d.id, ...d.data() })) });
  } catch (error) {
    if (error instanceof ApiAuthError) return authErrorResponse(error);
    const http = httpErrorResponse(error);
    if (http) return http;
    console.error("Assignment list failed:", error);
    return NextResponse.json({ error: "Failed to list assignments" }, { status: 500 });
  }
}

/**
 * Assign a course to team members: creates an lms_assignments record and an
 * lms_enrollments doc for each member with a linked Firebase account.
 */
export async function POST(request: NextRequest) {
  try {
    const actor = await requireAdmin(request);
    if (!adminDb) return NextResponse.json({ error: "Database service unavailable" }, { status: 503 });
    const parsed = assignmentSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
    }
    const { courseId, teamMemberIds, dueDate } = parsed.data;

    const courseSnap = await adminDb.collection(LMS_COURSES).doc(courseId).get();
    if (!courseSnap.exists) return NextResponse.json({ error: "Course not found" }, { status: 404 });
    const course = courseSnap.data() as { title?: string };

    const results: { teamMemberId: string; status: string }[] = [];
    const batch = adminDb.batch();
    const now = Timestamp.now();

    for (const teamMemberId of [...new Set(teamMemberIds)]) {
      const memberSnap = await adminDb.collection(COLLECTIONS.TEAM_MEMBERS).doc(teamMemberId).get();
      if (!memberSnap.exists) {
        results.push({ teamMemberId, status: "member_not_found" });
        continue;
      }
      const member = { id: memberSnap.id, ...memberSnap.data() } as TeamMemberDoc;
      if (!member.firebaseUid) {
        results.push({ teamMemberId, status: "no_portal_account" });
        continue;
      }

      const existing = await adminDb
        .collection(LMS_ENROLLMENTS)
        .where("userId", "==", member.firebaseUid)
        .where("courseId", "==", courseId)
        .limit(1)
        .get();
      if (!existing.empty) {
        results.push({ teamMemberId, status: "already_enrolled" });
        continue;
      }

      const enrollmentRef = adminDb.collection(LMS_ENROLLMENTS).doc();
      batch.set(enrollmentRef, {
        id: enrollmentRef.id,
        userId: member.firebaseUid,
        courseId,
        enrolledAt: now,
        completedAt: null,
        progressPercentage: 0,
        lastAccessedAt: null,
        certificateIssuedAt: null,
        certificateId: null,
        assignedBy: actor.email,
        ...(dueDate ? { dueDate } : {}),
      });

      const assignmentRef = adminDb.collection(LMS_ASSIGNMENTS).doc();
      batch.set(assignmentRef, {
        id: assignmentRef.id,
        courseId,
        courseTitle: course.title || "",
        teamMemberId,
        teamMemberName: `${member.firstName} ${member.lastName}`.trim(),
        teamMemberEmail: member.emailPrimary || "",
        enrollmentId: enrollmentRef.id,
        assignedByUid: actor.uid,
        assignedByEmail: actor.email,
        ...(dueDate ? { dueDate } : {}),
        assignedAt: FieldValue.serverTimestamp(),
        status: "assigned",
      });
      results.push({ teamMemberId, status: "assigned" });
    }

    await batch.commit();
    return NextResponse.json({ results });
  } catch (error) {
    if (error instanceof ApiAuthError) return authErrorResponse(error);
    const http = httpErrorResponse(error);
    if (http) return http;
    console.error("Course assignment failed:", error);
    return NextResponse.json({ error: "Course assignment failed" }, { status: 500 });
  }
}
