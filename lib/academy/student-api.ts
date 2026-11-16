"use client";

import { auth } from "@/lib/firebase";
import { adamsFetchJson } from "@/lib/adams-harness/client-api";
import type { PublicQuiz } from "./quiz-format";

/**
 * Student LMS client. Reads of the student's own enrolments use the Firebase
 * Auth uid (the canonical LMS student id); all writes go through /api/academy.
 */
export async function getCurrentUid(): Promise<string | null> {
  await auth?.authStateReady();
  return auth?.currentUser?.uid ?? null;
}

export interface StudentLesson {
  id: string;
  moduleId: string;
  courseId: string;
  title: string;
  description?: string | null;
  contentType: string;
  videoUrl?: string | null;
  videoDurationSeconds?: number | null;
  textContent?: string | null;
  downloadUrl?: string | null;
  imageUrl?: string | null;
  isPreview?: boolean;
  sortOrder?: number;
  quiz?: PublicQuiz;
}

export interface StudentProgress {
  id: string;
  lessonId: string;
  isCompleted: boolean;
  completedAt?: string | null;
  progressSeconds?: number;
  notes?: string | null;
}

export interface StudentCourseContent {
  course: {
    id: string;
    title?: string;
    description?: string | null;
    shortDescription?: string | null;
    instructorName?: string;
    instructorBio?: string | null;
    instructorImageUrl?: string | null;
    thumbnailUrl?: string | null;
    estimatedDurationMinutes?: number | null;
    difficultyLevel?: string;
    learningOutcomes?: string[];
    prerequisites?: string[];
  };
  enrollment: { id: string; progressPercentage: number; completedAt?: string | null; dueDate?: string } | null;
  modules: { id: string; title: string; description?: string | null; sortOrder?: number; lessons: StudentLesson[] }[];
  progress: Record<string, StudentProgress>;
  bestAttempt: Record<string, { score: number; passed: boolean }>;
}

export const getStudentCourse = (courseId: string) =>
  adamsFetchJson<StudentCourseContent>(`/api/academy/courses/${encodeURIComponent(courseId)}`);

export const enrollInCourseApi = (courseId: string) =>
  adamsFetchJson<{ enrollmentId: string; created: boolean }>(`/api/academy/courses/${encodeURIComponent(courseId)}/enroll`, { method: "POST" });

export const updateLessonProgressApi = (
  courseId: string,
  lessonId: string,
  body: { action: "complete" | "incomplete" | "notes" | "video"; notes?: string; progressSeconds?: number },
) =>
  adamsFetchJson<{ ok: true; progress: { progressPercentage: number; completed: boolean } | null }>(
    `/api/academy/courses/${encodeURIComponent(courseId)}/lessons/${encodeURIComponent(lessonId)}/progress`,
    { method: "POST", body: JSON.stringify(body) },
  );

export interface QuizGradeResult {
  attempt: { id: string; score: number; passed: boolean; passingScore: number; answers: number[]; correctness: boolean[] };
  review: { id: string; correctAnswer: number; explanation: string | null }[] | null;
  progress: { progressPercentage: number; completed: boolean } | null;
}

export const submitQuizApi = (courseId: string, lessonId: string, answers: number[]) =>
  adamsFetchJson<QuizGradeResult>(
    `/api/academy/courses/${encodeURIComponent(courseId)}/lessons/${encodeURIComponent(lessonId)}/quiz`,
    { method: "POST", body: JSON.stringify({ answers }) },
  );
