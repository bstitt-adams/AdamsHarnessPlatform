import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { HttpError } from "@/lib/adams-harness/server-store";
import { COLLECTIONS } from "@/lib/schema";
import type { AuthenticatedActor } from "@/lib/auth/server-auth";
import { parseQuizContent, toPublicQuiz, type PublicQuiz } from "./quiz-format";

/**
 * Server-side LMS service. All student writes (enrolment, progress, grading,
 * completion) go through here with the Admin SDK; Firestore rules make these
 * collections read-only for students so results cannot be forged.
 *
 * Canonical student identity: `userId` = Firebase Auth uid (matches rules and
 * owner reads), with `teamMemberId` stored alongside for platform lookups.
 */
export const LMS = {
  COURSES: "lms_courses",
  MODULES: "lms_course_modules",
  LESSONS: "lms_lessons",
  ENROLLMENTS: "lms_enrollments",
  PROGRESS: "lms_lesson_progress",
  QUIZ_ATTEMPTS: "lms_quiz_attempts",
  PURCHASES: "lms_course_purchases",
  POINTS: "lms_user_points",
} as const;

function db() {
  if (!adminDb) throw new HttpError(503, "Database service unavailable");
  return adminDb;
}

const isAdmin = (actor: Pick<AuthenticatedActor, "role">) => actor.role === "admin" || actor.role === "superadmin";

export const enrollmentDocId = (uid: string, courseId: string) => `${uid}_${courseId}`;

export async function loadCourse(courseId: string) {
  const snap = await db().collection(LMS.COURSES).doc(courseId).get();
  if (!snap.exists) throw new HttpError(404, "Course not found");
  return { id: snap.id, ...snap.data() } as { id: string; title?: string; isPublished?: boolean; isFree?: boolean; priceInCents?: number };
}

export async function findEnrollment(uid: string, courseId: string) {
  const direct = await db().collection(LMS.ENROLLMENTS).doc(enrollmentDocId(uid, courseId)).get();
  if (direct.exists) return direct;
  const legacy = await db().collection(LMS.ENROLLMENTS).where("userId", "==", uid).where("courseId", "==", courseId).limit(1).get();
  return legacy.empty ? null : legacy.docs[0];
}

/** Create an enrolment if missing. Paid courses require a paid purchase unless `bypassPayment`. */
export async function enrollUser(input: {
  uid: string;
  teamMemberId?: string;
  courseId: string;
  source: "self" | "assignment" | "purchase";
  assignedBy?: string;
  dueDate?: string;
  purchaseId?: string;
  bypassPayment?: boolean;
}) {
  const course = await loadCourse(input.courseId);
  const existing = await findEnrollment(input.uid, input.courseId);
  if (existing) return { id: existing.id, created: false };

  if (input.source === "self") {
    if (!course.isPublished) throw new HttpError(404, "Course not found");
    const paid = !course.isFree && (course.priceInCents || 0) > 0;
    if (paid && !input.bypassPayment) {
      const purchases = await db().collection(LMS.PURCHASES)
        .where("odUserId", "==", input.uid).where("courseId", "==", input.courseId).where("paymentStatus", "==", "paid").limit(1).get();
      if (purchases.empty) throw new HttpError(402, "This course must be purchased before enrolling");
    }
  }

  const ref = db().collection(LMS.ENROLLMENTS).doc(enrollmentDocId(input.uid, input.courseId));
  const batch = db().batch();
  batch.set(ref, {
    id: ref.id,
    userId: input.uid,
    ...(input.teamMemberId ? { teamMemberId: input.teamMemberId } : {}),
    courseId: input.courseId,
    enrolledAt: Timestamp.now(),
    completedAt: null,
    progressPercentage: 0,
    lastAccessedAt: null,
    certificateIssuedAt: null,
    certificateId: null,
    source: input.source,
    ...(input.assignedBy ? { assignedBy: input.assignedBy } : {}),
    ...(input.dueDate ? { dueDate: input.dueDate } : {}),
    ...(input.purchaseId ? { purchaseId: input.purchaseId } : {}),
  });
  batch.update(db().collection(LMS.COURSES).doc(input.courseId), { enrollmentCount: FieldValue.increment(1) });
  await batch.commit();
  return { id: ref.id, created: true };
}

/** Course outline + lessons for an enrolled student (or admin). Quiz answer keys are stripped. */
export async function getStudentCourseContent(actor: AuthenticatedActor, courseId: string) {
  const course = await loadCourse(courseId);
  const enrollment = await findEnrollment(actor.uid, courseId);
  if (!enrollment && !isAdmin(actor)) throw new HttpError(403, "Enroll in this course to access its content");

  const [modulesSnap, lessonsSnap, progressSnap, attemptsSnap] = await Promise.all([
    db().collection(LMS.MODULES).where("courseId", "==", courseId).get(),
    db().collection(LMS.LESSONS).where("courseId", "==", courseId).get(),
    db().collection(LMS.PROGRESS).where("odUserId", "==", actor.uid).where("courseId", "==", courseId).get(),
    db().collection(LMS.QUIZ_ATTEMPTS).where("odUserId", "==", actor.uid).where("courseId", "==", courseId).get(),
  ]);

  const bestAttempt: Record<string, { score: number; passed: boolean }> = {};
  for (const d of attemptsSnap.docs) {
    const a = d.data() as { lessonId: string; score: number; passed: boolean };
    if (!bestAttempt[a.lessonId] || a.score > bestAttempt[a.lessonId].score) bestAttempt[a.lessonId] = { score: a.score, passed: a.passed };
  }

  const lessons = lessonsSnap.docs
    .map((d) => {
      const lesson = { id: d.id, ...d.data() } as Record<string, unknown> & { id: string; moduleId: string; sortOrder?: number; contentType?: string; textContent?: string | null };
      if (lesson.contentType !== "quiz") return lesson;
      const quiz: PublicQuiz = toPublicQuiz(parseQuizContent(lesson.textContent || ""));
      return { ...lesson, textContent: null, quiz };
    })
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  const modules = modulesSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as Record<string, unknown> & { id: string; sortOrder?: number })
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
    .map((m) => ({ ...m, lessons: lessons.filter((l) => l.moduleId === m.id) }));

  const progress = Object.fromEntries(progressSnap.docs.map((d) => [d.data().lessonId as string, { id: d.id, ...d.data() }]));
  return {
    course,
    enrollment: enrollment ? { id: enrollment.id, ...enrollment.data() } : null,
    modules,
    progress,
    bestAttempt,
  };
}

async function requireEnrollmentAndLesson(actor: AuthenticatedActor, courseId: string, lessonId: string) {
  const enrollment = await findEnrollment(actor.uid, courseId);
  if (!enrollment) throw new HttpError(403, "You are not enrolled in this course");
  const lessonSnap = await db().collection(LMS.LESSONS).doc(lessonId).get();
  if (!lessonSnap.exists || lessonSnap.data()?.courseId !== courseId) throw new HttpError(404, "Lesson not found in this course");
  return { enrollment, lesson: { id: lessonSnap.id, ...lessonSnap.data() } as { id: string; contentType?: string; textContent?: string; title?: string } };
}

async function upsertProgress(actor: AuthenticatedActor, courseId: string, lessonId: string, enrollmentId: string, updates: Record<string, unknown>) {
  const ref = db().collection(LMS.PROGRESS).doc(`${actor.uid}_${lessonId}`);
  const snap = await ref.get();
  if (!snap.exists) {
    const legacy = await db().collection(LMS.PROGRESS).where("odUserId", "==", actor.uid).where("lessonId", "==", lessonId).limit(1).get();
    if (!legacy.empty) {
      await legacy.docs[0].ref.update(updates);
      return;
    }
  }
  await ref.set({
    ...(snap.exists ? {} : {
      id: ref.id, odUserId: actor.uid, teamMemberId: actor.teamMemberId || null, lessonId, courseId, enrollmentId,
      startedAt: Timestamp.now(), completedAt: null, progressSeconds: 0, isCompleted: false, notes: null,
    }),
    ...updates,
  }, { merge: true });
}

/** Recompute progress %, mark completion, and sync completion to the Certification Tracker once. */
export async function recomputeEnrollment(actor: AuthenticatedActor, courseId: string, enrollmentRef: FirebaseFirestore.DocumentReference) {
  const [lessonsSnap, doneSnap] = await Promise.all([
    db().collection(LMS.LESSONS).where("courseId", "==", courseId).get(),
    db().collection(LMS.PROGRESS).where("odUserId", "==", actor.uid).where("courseId", "==", courseId).where("isCompleted", "==", true).get(),
  ]);
  const total = lessonsSnap.size;
  const lessonIds = new Set(lessonsSnap.docs.map((d) => d.id));
  const done = doneSnap.docs.filter((d) => lessonIds.has(d.data().lessonId)).length;
  const progressPercentage = total ? Math.round((done / total) * 100) : 0;

  const enrollment = (await enrollmentRef.get()).data() || {};
  const updates: Record<string, unknown> = { progressPercentage, lastAccessedAt: Timestamp.now() };
  const justCompleted = progressPercentage === 100 && !enrollment.completedAt;
  if (justCompleted) updates.completedAt = Timestamp.now();
  if (progressPercentage < 100 && enrollment.completedAt) updates.completedAt = null;
  await enrollmentRef.update(updates);

  if (justCompleted && !enrollment.certificationSyncedAt) {
    await syncCompletionToCertification(actor, courseId, enrollmentRef);
  }
  return { progressPercentage, completed: progressPercentage === 100 };
}

async function syncCompletionToCertification(actor: AuthenticatedActor, courseId: string, enrollmentRef: FirebaseFirestore.DocumentReference) {
  const course = await loadCourse(courseId);
  let member: { id: string; firstName?: string; lastName?: string; emailPrimary?: string } | null = null;
  if (actor.teamMemberId) {
    const snap = await db().collection(COLLECTIONS.TEAM_MEMBERS).doc(actor.teamMemberId).get();
    if (snap.exists) member = { id: snap.id, ...snap.data() };
  }
  const ref = db().collection(COLLECTIONS.USER_TRAINING_CERTS).doc(`lms_${actor.uid}_${courseId}`);
  await ref.set({
    id: ref.id,
    userId: actor.uid,
    teamMemberId: member?.id || `unmatched-${actor.uid}`,
    userName: member ? `${member.firstName || ""} ${member.lastName || ""}`.trim() : actor.email,
    userEmail: member?.emailPrimary || actor.email,
    trainingTitle: course.title || "Adams Academy course",
    trainingCategory: "adams_academy",
    issuingOrganization: "Adams Academy",
    completionDate: new Date().toISOString().slice(0, 10),
    expirationDate: "9999-12-31",
    source: "lms_course_completion",
    sourceCourseId: courseId,
    enrollmentId: enrollmentRef.id,
    artifactStatus: "not_required",
    followUpStatus: "not_required",
    notificationStatus: "monitoring",
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  }, { merge: true });
  await enrollmentRef.update({ certificationSyncedAt: Timestamp.now() });
  await awardPoints(actor.uid, 100, "course_completed");
}

async function awardPoints(uid: string, points: number, reason: string) {
  const ref = db().collection(LMS.POINTS).doc(uid);
  await ref.set({
    id: uid, odUserId: uid, totalPoints: FieldValue.increment(points),
    ...(reason === "lesson_completed" ? { lessonsCompleted: FieldValue.increment(1) } : {}),
    ...(reason === "course_completed" ? { coursesCompleted: FieldValue.increment(1) } : {}),
    updatedAt: Timestamp.now(),
  }, { merge: true });
}

/** Mark a non-quiz lesson complete/incomplete, or save notes. Quiz lessons complete only via grading. */
export async function updateLessonProgress(actor: AuthenticatedActor, input: {
  courseId: string; lessonId: string; action: "complete" | "incomplete" | "notes" | "video"; notes?: string; progressSeconds?: number;
}) {
  const { enrollment, lesson } = await requireEnrollmentAndLesson(actor, input.courseId, input.lessonId);
  if (input.action === "notes") {
    await upsertProgress(actor, input.courseId, input.lessonId, enrollment.id, { notes: (input.notes || "").slice(0, 20_000) });
    return null;
  }
  if (input.action === "video") {
    await upsertProgress(actor, input.courseId, input.lessonId, enrollment.id, { progressSeconds: Math.max(0, Math.floor(input.progressSeconds || 0)) });
    return null;
  }
  if (lesson.contentType === "quiz" && input.action === "complete") {
    throw new HttpError(400, "Quiz lessons are completed by passing the quiz");
  }
  const completing = input.action === "complete";
  const before = await db().collection(LMS.PROGRESS).doc(`${actor.uid}_${input.lessonId}`).get();
  await upsertProgress(actor, input.courseId, input.lessonId, enrollment.id, { isCompleted: completing, completedAt: completing ? Timestamp.now() : null });
  if (completing && !before.data()?.isCompleted) await awardPoints(actor.uid, 10, "lesson_completed");
  return recomputeEnrollment(actor, input.courseId, enrollment.ref);
}

/** Grade a quiz server-side against the stored answer key. */
export async function gradeQuiz(actor: AuthenticatedActor, input: { courseId: string; lessonId: string; answers: number[] }) {
  const { enrollment, lesson } = await requireEnrollmentAndLesson(actor, input.courseId, input.lessonId);
  if (lesson.contentType !== "quiz") throw new HttpError(400, "This lesson is not a quiz");
  const quiz = parseQuizContent(lesson.textContent || "");
  if (!quiz.questions.length) throw new HttpError(400, "This quiz has no questions");
  if (input.answers.length !== quiz.questions.length) throw new HttpError(400, "Answer every question");

  const correctness = quiz.questions.map((q, i) => input.answers[i] === q.correctAnswer);
  const score = Math.round((correctness.filter(Boolean).length / quiz.questions.length) * 100);
  const passed = score >= quiz.passingScore;

  const ref = db().collection(LMS.QUIZ_ATTEMPTS).doc();
  await ref.set({
    id: ref.id, odUserId: actor.uid, teamMemberId: actor.teamMemberId || null, lessonId: input.lessonId, courseId: input.courseId,
    enrollmentId: enrollment.id, answers: input.answers, correctness, score, totalQuestions: quiz.questions.length,
    passed, passingScore: quiz.passingScore, startedAt: Timestamp.now(), completedAt: Timestamp.now(),
  });

  let progress = null;
  if (passed) {
    const before = await db().collection(LMS.PROGRESS).doc(`${actor.uid}_${input.lessonId}`).get();
    await upsertProgress(actor, input.courseId, input.lessonId, enrollment.id, { isCompleted: true, completedAt: Timestamp.now() });
    if (!before.data()?.isCompleted) await awardPoints(actor.uid, 10, "lesson_completed");
    progress = await recomputeEnrollment(actor, input.courseId, enrollment.ref);
  }
  return {
    attempt: { id: ref.id, score, passed, passingScore: quiz.passingScore, answers: input.answers, correctness },
    // Reveal the answer key and explanations only after passing.
    review: passed ? quiz.questions.map((q) => ({ id: q.id, correctAnswer: q.correctAnswer, explanation: q.explanation || null })) : null,
    progress,
  };
}
