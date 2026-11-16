import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/server-auth";
import { enrollUser } from "@/lib/academy/server";
import { academyErrorResponse } from "@/lib/academy/route-utils";

/** POST — self-enrol in a published course. Paid courses require a paid purchase. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ courseId: string }> }) {
  try {
    const actor = await requireUser(request);
    const { courseId } = await params;
    const result = await enrollUser({ uid: actor.uid, teamMemberId: actor.teamMemberId, courseId, source: "self" });
    return NextResponse.json({ enrollmentId: result.id, created: result.created });
  } catch (error) {
    return academyErrorResponse(error, "Enrollment failed");
  }
}
