import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

/** GET — public syllabus for a published course: section and lesson titles only, never lesson content. */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ courseId: string }> }) {
  if (!adminDb) return NextResponse.json({ error: "Database service unavailable" }, { status: 503 });
  const { courseId } = await params;
  const course = await adminDb.collection("lms_courses").doc(courseId).get();
  if (!course.exists || course.data()?.isPublished !== true) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }
  const [modulesSnap, lessonsSnap] = await Promise.all([
    adminDb.collection("lms_course_modules").where("courseId", "==", courseId).get(),
    adminDb.collection("lms_lessons").where("courseId", "==", courseId).get(),
  ]);
  const bySort = (a: { sortOrder?: number }, b: { sortOrder?: number }) => (a.sortOrder || 0) - (b.sortOrder || 0);
  const lessons = lessonsSnap.docs
    .map((d) => {
      const l = d.data();
      return {
        id: d.id,
        moduleId: l.moduleId as string,
        title: (l.title as string) || "",
        contentType: (l.contentType as string) || "text",
        isPreview: l.isPreview === true,
        videoDurationSeconds: (l.videoDurationSeconds as number | null) ?? null,
        sortOrder: (l.sortOrder as number) || 0,
      };
    })
    .sort(bySort);
  const modules = modulesSnap.docs
    .map((d) => ({ id: d.id, title: (d.data().title as string) || "", description: (d.data().description as string | null) ?? null, sortOrder: (d.data().sortOrder as number) || 0 }))
    .sort(bySort)
    .map((m) => ({ ...m, lessons: lessons.filter((l) => l.moduleId === m.id) }));
  return NextResponse.json({ modules }, { headers: { "Cache-Control": "public, max-age=60" } });
}
