import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, authErrorResponse } from "@/lib/auth/server-auth";
import { parsePptx } from "@/lib/academy/pptx";
import { importSlidesAsCourse } from "@/lib/academy/pptx-import";
import { HttpError } from "@/lib/adams-harness/server-store";

const MAX_FILE_BYTES = 25 * 1024 * 1024;
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "A .pptx file is required" }, { status: 400 });
    }
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: "File exceeds the 25MB limit" }, { status: 413 });
    }
    if (!file.name.toLowerCase().endsWith(".pptx")) {
      return NextResponse.json({ error: "Only .pptx files are supported" }, { status: 400 });
    }

    const slides = await parsePptx(Buffer.from(await file.arrayBuffer()));
    const withText = slides.filter((s) => s.title || s.bullets.length);
    if (!withText.length) {
      return NextResponse.json({ error: "No readable text found in the slides" }, { status: 400 });
    }

    const num = (key: string) => {
      const v = Number(form.get(key));
      return Number.isFinite(v) && v > 0 ? v : undefined;
    };
    const result = await importSlidesAsCourse(withText, {
      title: (form.get("title") as string | null)?.trim() || undefined,
      questionsPerModule: num("questionsPerModule"),
      examQuestions: num("examQuestions"),
      passingScore: num("passingScore"),
      includeExam: form.get("includeExam") !== "false",
      instructorName: (form.get("instructorName") as string | null)?.trim() || undefined,
      isFree: form.get("isFree") !== "false",
    });

    return NextResponse.json({ success: true, ...result, slidesProcessed: withText.length });
  } catch (error) {
    const authError = authErrorResponse(error);
    if (authError) return authError;
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Import failed";
    const status = /not a valid|no slides|no readable/i.test(message) ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
