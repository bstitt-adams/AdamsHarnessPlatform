import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/server-auth";
import { updateLessonProgress } from "@/lib/academy/server";
import { academyErrorResponse } from "@/lib/academy/route-utils";

const bodySchema = z.object({
  action: z.enum(["complete", "incomplete", "notes", "video"]),
  notes: z.string().max(20_000).optional(),
  progressSeconds: z.number().min(0).max(86_400).optional(),
});

/** POST — mark a lesson complete/incomplete, save notes, or record video position. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ courseId: string; lessonId: string }> }) {
  try {
    const actor = await requireUser(request);
    const { courseId, lessonId } = await params;
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid progress update" }, { status: 400 });
    const progress = await updateLessonProgress(actor, { courseId, lessonId, ...parsed.data });
    return NextResponse.json({ ok: true, progress });
  } catch (error) {
    return academyErrorResponse(error, "Failed to update lesson progress");
  }
}
