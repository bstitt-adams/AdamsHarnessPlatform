import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/server-auth";
import { gradeQuiz } from "@/lib/academy/server";
import { academyErrorResponse } from "@/lib/academy/route-utils";

const bodySchema = z.object({ answers: z.array(z.number().int().min(0).max(25)).min(1).max(200) });

/** POST — submit quiz answers; graded server-side against the stored answer key. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ courseId: string; lessonId: string }> }) {
  try {
    const actor = await requireUser(request);
    const { courseId, lessonId } = await params;
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid quiz submission" }, { status: 400 });
    return NextResponse.json(await gradeQuiz(actor, { courseId, lessonId, answers: parsed.data.answers }));
  } catch (error) {
    return academyErrorResponse(error, "Failed to grade quiz");
  }
}
