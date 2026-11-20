/**
 * PowerPoint → LMS course import.
 *
 * Slides extracted by lib/academy/pptx.ts are sent to Hermes with a strict
 * schema; the model returns a course outline, markdown lesson bodies, and
 * structured quiz questions. Quizzes are serialized to the LMS quiz markdown
 * format server-side (never trusted to the model), then course/module/lesson
 * docs are written with the Admin SDK mirroring lib/firebase-lms.ts shapes.
 */

import { z } from "zod";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { requestHermesStructured } from "@/lib/hermes/client";
import { HttpError } from "@/lib/adams-harness/server-store";
import { parseQuizContent } from "./quiz-format";
import type { ParsedSlide } from "./pptx";

const COLLECTIONS = {
  COURSES: "lms_courses",
  MODULES: "lms_course_modules",
  LESSONS: "lms_lessons",
} as const;

const slugify = (title: string) =>
  title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "lesson";

const quizQuestionSchema = z.object({
  question: z.string().min(5),
  // The LMS quiz parser only grades A-D options.
  options: z.array(z.string().min(1)).min(2).max(4),
  correctIndex: z.number().int().min(0),
  explanation: z.string().optional(),
});

/**
 * Models regularly return near-miss shapes (1-based indexes, letter answers,
 * oversized fields, numeric strings). Coerce to the strict shape before
 * validation instead of rejecting outright.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeCourse(raw: any): any {
  if (!raw || typeof raw !== "object") return raw;
  const normIndex = (q: Record<string, unknown>, optionCount: number) => {
    let idx: unknown = q.correctIndex ?? q.correctAnswer ?? q.answer ?? q.correct;
    if (typeof idx === "string") {
      const letter = idx.trim().toUpperCase();
      idx = /^[A-D]$/.test(letter) ? letter.charCodeAt(0) - 65 : parseInt(letter, 10);
    }
    let n = Number(idx);
    if (!Number.isFinite(n)) n = 0;
    if (n >= 1 && n <= optionCount && q.correctIndex === undefined) n -= 1;
    return Math.min(Math.max(Math.trunc(n), 0), Math.max(optionCount - 1, 0));
  };
  const normQuestions = (qs: unknown, cap: number) =>
    (Array.isArray(qs) ? qs : [])
      .map((q) => {
        if (!q || typeof q !== "object") return null;
        const rec = q as Record<string, unknown>;
        const options = (Array.isArray(rec.options) ? rec.options : []).map(String).filter(Boolean).slice(0, 4);
        return { question: String(rec.question || ""), options, correctIndex: normIndex(rec, options.length), explanation: rec.explanation ? String(rec.explanation) : undefined };
      })
      .filter(Boolean)
      .slice(0, cap);
  const normQuiz = (quiz: unknown, fallbackTitle: string, cap: number) => {
    // Models variously return quiz as {questions: [...]}, an array of questions
    // directly, or nest under items/questions — accept all of them.
    const rec = Array.isArray(quiz) ? { questions: quiz } : (quiz && typeof quiz === "object" ? quiz : {}) as Record<string, unknown>;
    const qs = rec.questions ?? rec.items ?? rec.quiz ?? rec.assessment;
    return { title: String(rec.title || rec.name || fallbackTitle), questions: normQuestions(qs, cap) };
  };
  const difficultyMap: Record<string, string> = {
    beginner: "beginner", easy: "beginner", introductory: "beginner", intro: "beginner", basic: "beginner",
    intermediate: "intermediate", medium: "intermediate", moderate: "intermediate",
    advanced: "advanced", expert: "advanced", hard: "advanced",
  };
  const difficulty = difficultyMap[String(raw.difficultyLevel || raw.difficulty || "").trim().toLowerCase()] || "beginner";
  return {
    ...raw,
    title: String(raw.title || "Imported Course"),
    difficultyLevel: difficulty,
    shortDescription: raw.shortDescription ? String(raw.shortDescription).slice(0, 300) : undefined,
    description: raw.description ? String(raw.description) : undefined,
    estimatedDurationMinutes: Number.isFinite(Number(raw.estimatedDurationMinutes)) ? Math.trunc(Number(raw.estimatedDurationMinutes)) : undefined,
    learningOutcomes: (Array.isArray(raw.learningOutcomes) ? raw.learningOutcomes : []).map(String).slice(0, 12),
    modules: (Array.isArray(raw.modules) ? raw.modules : []).slice(0, 10).map((m: Record<string, unknown>, i: number) => ({
      title: String(m?.title || m?.name || `Module ${i + 1}`),
      description: m?.description ? String(m.description) : undefined,
      lessons: (Array.isArray(m?.lessons) ? m.lessons : []).slice(0, 6).map((l: Record<string, unknown>, li: number) => ({
        title: String(l?.title || `Lesson ${li + 1}`),
        body: String(l?.body ?? l?.content ?? l?.text ?? ""),
      })),
      quiz: normQuiz(m?.quiz ?? m?.assessment ?? m?.quizQuestions ?? m?.questions, `Module ${i + 1} Quiz`, 15),
    })),
    finalExam: (raw.finalExam ?? raw.exam ?? raw.finalAssessment) ? normQuiz(raw.finalExam ?? raw.exam ?? raw.finalAssessment, "Final Exam", 25) : undefined,
  };
}

const importedCourseSchema = z.object({
  title: z.string().min(3),
  shortDescription: z.string().max(300).optional(),
  description: z.string().optional(),
  difficultyLevel: z.enum(["beginner", "intermediate", "advanced"]),
  estimatedDurationMinutes: z.number().int().min(5).max(2000).optional(),
  learningOutcomes: z.array(z.string()).max(12).optional(),
  modules: z.array(z.object({
    title: z.string().min(2),
    description: z.string().optional(),
    lessons: z.array(z.object({
      title: z.string().min(2),
      body: z.string().min(20),
    })).min(1).max(6),
    quiz: z.object({
      title: z.string().min(2),
      questions: z.array(quizQuestionSchema).min(1).max(15),
    }),
  })).min(1).max(10),
  finalExam: z.object({
    title: z.string().min(2),
    questions: z.array(quizQuestionSchema).min(1).max(25),
  }).optional(),
});

const importedCourseInput = z.preprocess(normalizeCourse, importedCourseSchema);

export type ImportedCourse = z.infer<typeof importedCourseSchema>;

/** Serializes structured questions into the LMS quiz markdown the grader parses. */
export function quizToMarkdown(
  title: string,
  passingScore: number,
  questions: z.infer<typeof quizQuestionSchema>[],
): string {
  const lines = [`# ${title}`, `Passing Score: ${passingScore}%`, ""];
  questions.forEach((q, i) => {
    const correct = Math.min(Math.max(q.correctIndex, 0), q.options.length - 1);
    lines.push(`## Question ${i + 1}: ${q.question}`);
    q.options.forEach((opt, oi) => lines.push(`${String.fromCharCode(65 + oi)}) ${opt}${oi === correct ? " ✓" : ""}`));
    if (q.explanation) lines.push(`*${q.explanation}*`);
    lines.push("");
  });
  const markdown = lines.join("\n");
  const parsed = parseQuizContent(markdown);
  if (parsed.questions.length !== questions.length ||
      parsed.questions.some((p, i) => p.correctAnswer !== Math.min(Math.max(questions[i].correctIndex, 0), questions[i].options.length - 1))) {
    throw new Error("Quiz serialization failed validation");
  }
  return markdown;
}

const MAX_SLIDES = 80;

export interface ImportOptions {
  title?: string;
  questionsPerModule?: number;
  examQuestions?: number;
  passingScore?: number;
  includeExam?: boolean;
  instructorName?: string;
  isFree?: boolean;
}

/** Builds a course outline + all lesson/quiz content from parsed slides via Hermes. */
export async function generateCourseFromSlides(slides: ParsedSlide[], options: ImportOptions): Promise<ImportedCourse> {
  const capped = slides.slice(0, MAX_SLIDES);
  const perModule = Math.min(Math.max(options.questionsPerModule ?? 4, 1), 10);
  const examCount = Math.min(Math.max(options.examQuestions ?? 10, 5), 20);
  const slideText = capped
    .map((s) => `Slide ${s.index}: ${s.title}\n${s.bullets.map((b) => `- ${b}`).join("\n")}${s.notes ? `\nNotes: ${s.notes}` : ""}`)
    .join("\n\n")
    .slice(0, 60000);

  const { data } = await requestHermesStructured({
    systemPrompt:
      `You convert PowerPoint decks into Adams Academy training courses. ` +
      `Group the slides below into 2-6 themed modules. For every module produce 1-4 text lessons ` +
      `(markdown body of 120-300 words that expands the slide content into teachable material — use short paragraphs and dashes, no code fences) ` +
      `plus one quiz (${perModule} multiple-choice questions, 4 options each, correctIndex 0-based, short explanation). ` +
      `${options.includeExam === false ? "" : `Also produce a final exam (${examCount} questions) spanning all content. `}` +
      `Every lesson fact and quiz answer must come from the slide text — never invent procedures, standards, or numbers. ` +
      `Quiz questions must be answerable from the lesson bodies you write. Difficulty: infer from content.` +
      (options.title ? ` The course title is "${options.title}".` : ""),
    messages: [{ role: "user", content: slideText }],
    schema: importedCourseInput,
    temperature: 0.3,
  });
  return data;
}

export interface ImportResult {
  courseId: string;
  title: string;
  modules: number;
  lessons: number;
  quizzes: number;
}

/** Writes the generated outline as an unpublished draft course. */
export async function importSlidesAsCourse(slides: ParsedSlide[], options: ImportOptions): Promise<ImportResult> {
  if (!adminDb) throw new HttpError(503, "Database service unavailable");
  const db = adminDb;
  if (!slides.length) throw new HttpError(400, "The file contains no slides with text");

  const outline = await generateCourseFromSlides(slides, options);
  const passingScore = Math.min(Math.max(options.passingScore ?? 70, 50), 100);
  const instructorName = options.instructorName?.trim() || "Adams Electric";

  const courseRef = db.collection(COLLECTIONS.COURSES).doc();
  await courseRef.set({
    id: courseRef.id,
    title: outline.title,
    slug: slugify(outline.title),
    description: outline.description || null,
    shortDescription: outline.shortDescription || null,
    thumbnailUrl: null,
    thumbnailImageId: null,
    previewVideoUrl: null,
    categoryId: null,
    instructorName,
    instructorBio: null,
    instructorImageUrl: null,
    difficultyLevel: outline.difficultyLevel,
    estimatedDurationMinutes: outline.estimatedDurationMinutes || null,
    minSubscriptionTierId: null,
    isFeatured: false,
    isPublished: false,
    publishedAt: null,
    tags: ["pptx-import"],
    learningOutcomes: outline.learningOutcomes || [],
    prerequisites: [],
    enrollmentCount: 0,
    priceInCents: 0,
    compareAtPriceInCents: null,
    isFree: options.isFree ?? true,
    stripePriceId: null,
    stripeProductId: null,
    importedFrom: "pptx",
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });

  const batch = db.batch();
  let lessonCount = 0;
  let quizCount = 0;
  const writeModule = (title: string, description: string | null, sortOrder: number) => {
    const ref = db.collection(COLLECTIONS.MODULES).doc();
    batch.set(ref, { id: ref.id, courseId: courseRef.id, title, description, sortOrder, createdAt: Timestamp.now() });
    return ref.id;
  };
  const writeLesson = (moduleId: string, data: {
    title: string; contentType: "text" | "quiz"; textContent: string; description?: string | null; sortOrder: number;
  }) => {
    const ref = db.collection(COLLECTIONS.LESSONS).doc();
    batch.set(ref, {
      id: ref.id, moduleId, courseId: courseRef.id, title: data.title, slug: slugify(data.title),
      description: data.description || null, contentType: data.contentType,
      videoUrl: null, videoDurationSeconds: null, textContent: data.textContent,
      downloadUrl: null, imageId: null, imageUrl: null, isPreview: false,
      sortOrder: data.sortOrder, createdAt: Timestamp.now(), updatedAt: Timestamp.now(),
    });
    lessonCount++;
  };

  outline.modules.forEach((mod, mi) => {
    const moduleId = writeModule(mod.title, mod.description || null, mi);
    mod.lessons.forEach((lesson, li) => {
      writeLesson(moduleId, { title: lesson.title, contentType: "text", textContent: lesson.body, sortOrder: li });
    });
    writeLesson(moduleId, {
      title: mod.quiz.title || `Module ${mi + 1} Quiz`, contentType: "quiz",
      textContent: quizToMarkdown(mod.quiz.title || `Module ${mi + 1} Quiz`, passingScore, mod.quiz.questions),
      sortOrder: mod.lessons.length,
    });
    quizCount++;
  });

  if (outline.finalExam?.questions.length) {
    const examModuleId = writeModule("Final Assessment", "Course-wide exam covering all modules.", outline.modules.length);
    writeLesson(examModuleId, {
      title: outline.finalExam.title || "Final Exam", contentType: "quiz",
      textContent: quizToMarkdown(outline.finalExam.title || "Final Exam", passingScore, outline.finalExam.questions),
      sortOrder: 0,
    });
    quizCount++;
  }

  await batch.commit();
  await courseRef.update({ lessonCount, updatedAt: FieldValue.serverTimestamp() });
  return { courseId: courseRef.id, title: outline.title, modules: outline.modules.length + (outline.finalExam ? 1 : 0), lessons: lessonCount, quizzes: quizCount };
}
