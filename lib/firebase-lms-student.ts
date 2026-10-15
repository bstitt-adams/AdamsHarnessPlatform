/**
 * Firebase LMS Student Utilities
 * 
 * Provides student-facing operations for course progress, quiz attempts, and certificates.
 */

import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  Timestamp,
  serverTimestamp
} from "firebase/firestore";
import { db } from "./firebase";

const LMS_COLLECTIONS = {
  LESSONS: "lms_lessons",
  LESSON_PROGRESS: "lms_lesson_progress",
  QUIZ_ATTEMPTS: "lms_quiz_attempts",
  ENROLLMENTS: "lms_enrollments",
  CERTIFICATES: "lms_certificates",
};

// ============================================================================
// TYPES
// ============================================================================

export interface LessonProgressDoc {
  id: string;
  odUserId: string;
  lessonId: string;
  courseId: string;
  enrollmentId: string;
  startedAt: Timestamp;
  completedAt: Timestamp | null;
  progressSeconds: number;
  isCompleted: boolean;
  notes: string | null;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

export interface QuizAttemptDoc {
  id: string;
  odUserId: string;
  lessonId: string;
  courseId: string;
  enrollmentId: string;
  questions: QuizQuestion[];
  answers: number[];
  score: number;
  totalQuestions: number;
  passed: boolean;
  passingScore: number;
  startedAt: Timestamp;
  completedAt: Timestamp;
}

// ============================================================================
// LESSON PROGRESS
// ============================================================================

export async function getLessonProgress(
  userId: string,
  lessonId: string
): Promise<LessonProgressDoc | null> {
  if (!db) throw new Error("Firebase not initialized");

  const progressRef = collection(db, LMS_COLLECTIONS.LESSON_PROGRESS);
  const q = query(
    progressRef,
    where("odUserId", "==", userId),
    where("lessonId", "==", lessonId),
    limit(1)
  );
  const snapshot = await getDocs(q);

  if (snapshot.empty) return null;
  return snapshot.docs[0].data() as LessonProgressDoc;
}

export async function getCourseProgress(
  userId: string,
  courseId: string
): Promise<LessonProgressDoc[]> {
  if (!db) throw new Error("Firebase not initialized");

  const progressRef = collection(db, LMS_COLLECTIONS.LESSON_PROGRESS);
  const q = query(
    progressRef,
    where("odUserId", "==", userId),
    where("courseId", "==", courseId)
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => doc.data() as LessonProgressDoc);
}

export async function markLessonComplete(data: {
  userId: string;
  lessonId: string;
  courseId: string;
  enrollmentId: string;
}): Promise<LessonProgressDoc> {
  if (!db) throw new Error("Firebase not initialized");

  const progressRef = collection(db, LMS_COLLECTIONS.LESSON_PROGRESS);
  const q = query(
    progressRef,
    where("odUserId", "==", data.userId),
    where("lessonId", "==", data.lessonId),
    limit(1)
  );
  const snapshot = await getDocs(q);

  let progressDoc: LessonProgressDoc;

  if (snapshot.empty) {
    // Create new progress
    const newDocRef = doc(progressRef);
    progressDoc = {
      id: newDocRef.id,
      odUserId: data.userId,
      lessonId: data.lessonId,
      courseId: data.courseId,
      enrollmentId: data.enrollmentId,
      startedAt: Timestamp.now(),
      completedAt: Timestamp.now(),
      progressSeconds: 0,
      isCompleted: true,
      notes: null,
    };
    await setDoc(newDocRef, progressDoc);
  } else {
    // Update existing progress
    const existingDoc = snapshot.docs[0];
    const updates = {
      isCompleted: true,
      completedAt: Timestamp.now(),
    };
    await updateDoc(existingDoc.ref, updates);
    progressDoc = { ...existingDoc.data(), ...updates } as LessonProgressDoc;
  }

  // Update enrollment progress percentage
  await updateEnrollmentProgress(data.enrollmentId, data.courseId);

  return progressDoc;
}

export async function markLessonIncomplete(data: {
  userId: string;
  lessonId: string;
  enrollmentId: string;
  courseId: string;
}): Promise<void> {
  if (!db) throw new Error("Firebase not initialized");

  const progressRef = collection(db, LMS_COLLECTIONS.LESSON_PROGRESS);
  const q = query(
    progressRef,
    where("odUserId", "==", data.userId),
    where("lessonId", "==", data.lessonId),
    limit(1)
  );
  const snapshot = await getDocs(q);

  if (!snapshot.empty) {
    await updateDoc(snapshot.docs[0].ref, {
      isCompleted: false,
      completedAt: null,
    });
    await updateEnrollmentProgress(data.enrollmentId, data.courseId);
  }
}

export async function updateLessonVideoProgress(data: {
  userId: string;
  lessonId: string;
  courseId: string;
  enrollmentId: string;
  progressSeconds: number;
}): Promise<void> {
  if (!db) throw new Error("Firebase not initialized");

  const progressRef = collection(db, LMS_COLLECTIONS.LESSON_PROGRESS);
  const q = query(
    progressRef,
    where("odUserId", "==", data.userId),
    where("lessonId", "==", data.lessonId),
    limit(1)
  );
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    // Create new progress
    const newDocRef = doc(progressRef);
    await setDoc(newDocRef, {
      id: newDocRef.id,
      odUserId: data.userId,
      lessonId: data.lessonId,
      courseId: data.courseId,
      enrollmentId: data.enrollmentId,
      startedAt: Timestamp.now(),
      completedAt: null,
      progressSeconds: data.progressSeconds,
      isCompleted: false,
      notes: null,
    });
  } else {
    await updateDoc(snapshot.docs[0].ref, {
      progressSeconds: data.progressSeconds,
    });
  }
}

async function updateEnrollmentProgress(
  enrollmentId: string,
  courseId: string
): Promise<void> {
  if (!db) throw new Error("Firebase not initialized");

  // Get total lessons in course
  const lessonsRef = collection(db, LMS_COLLECTIONS.LESSONS);
  const lessonsQuery = query(lessonsRef, where("courseId", "==", courseId));
  const lessonsSnapshot = await getDocs(lessonsQuery);
  const totalLessons = lessonsSnapshot.size;

  if (totalLessons === 0) return;

  // Get completed lessons
  const progressRef = collection(db, LMS_COLLECTIONS.LESSON_PROGRESS);
  const q = query(
    progressRef,
    where("enrollmentId", "==", enrollmentId),
    where("isCompleted", "==", true)
  );
  const snapshot = await getDocs(q);
  const completedLessons = snapshot.size;

  const progressPercentage = Math.round((completedLessons / totalLessons) * 100);

  const enrollmentRef = doc(db, LMS_COLLECTIONS.ENROLLMENTS, enrollmentId);
  const updates: Record<string, unknown> = {
    progressPercentage,
    lastAccessedAt: Timestamp.now(),
  };

  if (progressPercentage === 100) {
    updates.completedAt = Timestamp.now();
  }

  await updateDoc(enrollmentRef, updates);
}

// ============================================================================
// QUIZ ATTEMPTS
// ============================================================================

export async function submitQuizAttempt(data: {
  userId: string;
  lessonId: string;
  courseId: string;
  enrollmentId: string;
  questions: QuizQuestion[];
  answers: number[];
  passingScore?: number;
}): Promise<QuizAttemptDoc> {
  if (!db) throw new Error("Firebase not initialized");

  const passingScore = data.passingScore || 70;
  
  // Calculate score
  let correctAnswers = 0;
  for (let i = 0; i < data.questions.length; i++) {
    if (data.answers[i] === data.questions[i].correctAnswer) {
      correctAnswers++;
    }
  }
  
  const score = Math.round((correctAnswers / data.questions.length) * 100);
  const passed = score >= passingScore;

  const attemptsRef = collection(db, LMS_COLLECTIONS.QUIZ_ATTEMPTS);
  const newDocRef = doc(attemptsRef);

  const attemptDoc: QuizAttemptDoc = {
    id: newDocRef.id,
    odUserId: data.userId,
    lessonId: data.lessonId,
    courseId: data.courseId,
    enrollmentId: data.enrollmentId,
    questions: data.questions,
    answers: data.answers,
    score,
    totalQuestions: data.questions.length,
    passed,
    passingScore,
    startedAt: Timestamp.now(),
    completedAt: Timestamp.now(),
  };

  await setDoc(newDocRef, attemptDoc);

  // If passed, mark lesson as complete
  if (passed) {
    await markLessonComplete({
      userId: data.userId,
      lessonId: data.lessonId,
      courseId: data.courseId,
      enrollmentId: data.enrollmentId,
    });
  }

  return attemptDoc;
}

export async function getQuizAttempts(
  userId: string,
  lessonId: string
): Promise<QuizAttemptDoc[]> {
  if (!db) throw new Error("Firebase not initialized");

  const attemptsRef = collection(db, LMS_COLLECTIONS.QUIZ_ATTEMPTS);
  const q = query(
    attemptsRef,
    where("odUserId", "==", userId),
    where("lessonId", "==", lessonId),
    orderBy("completedAt", "desc")
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => doc.data() as QuizAttemptDoc);
}

export async function getBestQuizAttempt(
  userId: string,
  lessonId: string
): Promise<QuizAttemptDoc | null> {
  if (!db) throw new Error("Firebase not initialized");

  const attempts = await getQuizAttempts(userId, lessonId);
  if (attempts.length === 0) return null;

  // Return the attempt with the highest score
  return attempts.reduce((best, current) => 
    current.score > best.score ? current : best
  );
}

// ============================================================================
// NOTES
// ============================================================================

export async function saveLessonNotes(data: {
  userId: string;
  lessonId: string;
  courseId: string;
  enrollmentId: string;
  notes: string;
}): Promise<void> {
  if (!db) throw new Error("Firebase not initialized");

  const progressRef = collection(db, LMS_COLLECTIONS.LESSON_PROGRESS);
  const q = query(
    progressRef,
    where("odUserId", "==", data.userId),
    where("lessonId", "==", data.lessonId),
    limit(1)
  );
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    // Create new progress with notes
    const newDocRef = doc(progressRef);
    await setDoc(newDocRef, {
      id: newDocRef.id,
      odUserId: data.userId,
      lessonId: data.lessonId,
      courseId: data.courseId,
      enrollmentId: data.enrollmentId,
      startedAt: Timestamp.now(),
      completedAt: null,
      progressSeconds: 0,
      isCompleted: false,
      notes: data.notes,
    });
  } else {
    await updateDoc(snapshot.docs[0].ref, {
      notes: data.notes,
    });
  }
}
