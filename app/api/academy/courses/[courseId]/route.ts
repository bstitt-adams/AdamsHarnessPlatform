import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/server-auth";
import { getStudentCourseContent } from "@/lib/academy/server";
import { academyErrorResponse, toJson } from "@/lib/academy/route-utils";

/** GET — course outline, lessons (quiz answer keys stripped), progress and best quiz scores for the signed-in student. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ courseId: string }> }) {
  try {
    const actor = await requireUser(request);
    const { courseId } = await params;
    return NextResponse.json(toJson(await getStudentCourseContent(actor, courseId)));
  } catch (error) {
    return academyErrorResponse(error, "Failed to load course content");
  }
}
