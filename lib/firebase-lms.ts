/**
 * Firebase LMS (Learning Management System) Utility
 * 
 * Provides CRUD operations for courses, lessons, workshops, enrollments,
 * progress tracking, certificates, and gamification features.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  serverTimestamp,
  increment,
  writeBatch,
  onSnapshot,
  DocumentReference,
} from "firebase/firestore";
import { db } from "./firebase";
import type {
  Course,
  CourseModule,
  Lesson,
  CourseEnrollment,
  LessonProgress,
  Workshop,
  WorkshopRegistration,
  Assessment,
  AssessmentAttempt,
  Certificate,
  CourseCategory,
  SubscriptionTier,
  LearningPath,
  DifficultyLevel,
  ContentType,
  WorkshopType,
} from "@/types/academy";

// ============================================================================
// COLLECTION NAMES
// ============================================================================

export const LMS_COLLECTIONS = {
  COURSES: "lms_courses",
  COURSE_MODULES: "lms_course_modules",
  LESSONS: "lms_lessons",
  ENROLLMENTS: "lms_enrollments",
  LESSON_PROGRESS: "lms_lesson_progress",
  WORKSHOPS: "lms_workshops",
  WORKSHOP_REGISTRATIONS: "lms_workshop_registrations",
  ASSESSMENTS: "lms_assessments",
  ASSESSMENT_ATTEMPTS: "lms_assessment_attempts",
  CERTIFICATES: "lms_certificates",
  CATEGORIES: "lms_categories",
  SUBSCRIPTION_TIERS: "lms_subscription_tiers",
  LEARNING_PATHS: "lms_learning_paths",
  USER_BADGES: "lms_user_badges",
  USER_POINTS: "lms_user_points",
  BADGES: "lms_badges",
  ACADEMY_SETTINGS: "lms_settings",
  COURSE_PURCHASES: "lms_course_purchases",
  CART_ITEMS: "lms_cart_items",
} as const;

// ============================================================================
// COURSE PURCHASE TYPES
// ============================================================================

export interface CoursePurchaseDoc {
  id: string;
  odUserId: string;
  userEmail: string;
  userName: string;
  courseId: string;
  courseTitle: string;
  priceInCents: number;
  discountInCents: number;
  totalInCents: number;
  couponCode: string | null;
  stripeSessionId: string | null;
  stripePaymentIntentId: string | null;
  paymentStatus: "pending" | "paid" | "failed" | "refunded";
  purchasedAt: Timestamp;
  refundedAt: Timestamp | null;
  refundReason: string | null;
  createdAt: Timestamp;
}

export interface CartItemDoc {
  id: string;
  odUserId: string;
  courseId: string;
  addedAt: Timestamp;
}

// ============================================================================
// FIRESTORE DOCUMENT TYPES (with Timestamp)
// ============================================================================

export interface CourseDoc {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  shortDescription: string | null;
  thumbnailUrl: string | null;
  thumbnailImageId: string | null; // Firebase image ID
  previewVideoUrl: string | null;
  categoryId: string | null;
  instructorName: string;
  instructorBio: string | null;
  instructorImageUrl: string | null;
  difficultyLevel: DifficultyLevel;
  estimatedDurationMinutes: number | null;
  minSubscriptionTierId: string | null;
  isFeatured: boolean;
  isPublished: boolean;
  publishedAt: Timestamp | null;
  tags: string[];
  learningOutcomes: string[];
  prerequisites: string[];
  enrollmentCount: number;
  // Pricing fields
  priceInCents: number; // Price in cents (e.g., 9900 = $99.00)
  compareAtPriceInCents: number | null; // Original price for showing discount
  isFree: boolean; // Whether course is free
  stripePriceId: string | null; // Stripe Price ID for recurring/one-time
  stripeProductId: string | null; // Stripe Product ID
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CourseModuleDoc {
  id: string;
  courseId: string;
  title: string;
  description: string | null;
  sortOrder: number;
  createdAt: Timestamp;
}

export interface LessonDoc {
  id: string;
  moduleId: string;
  courseId: string;
  title: string;
  slug: string;
  description: string | null;
  contentType: ContentType;
  videoUrl: string | null;
  videoDurationSeconds: number | null;
  textContent: string | null;
  downloadUrl: string | null;
  imageId: string | null; // Firebase image ID for lesson thumbnail/content image
  imageUrl: string | null; // Cached image URL for display
  isPreview: boolean;
  sortOrder: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface EnrollmentDoc {
  id: string;
  userId: string;
  courseId: string;
  enrolledAt: Timestamp;
  completedAt: Timestamp | null;
  progressPercentage: number;
  lastAccessedAt: Timestamp | null;
  certificateIssuedAt: Timestamp | null;
  certificateId: string | null;
}

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

export interface WorkshopDoc {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  shortDescription: string | null;
  thumbnailUrl: string | null;
  thumbnailImageId: string | null;
  workshopType: WorkshopType;
  categoryId: string | null;
  instructorName: string;
  scheduledStart: Timestamp | null;
  scheduledEnd: Timestamp | null;
  timezone: string;
  maxParticipants: number | null;
  minSubscriptionTierId: string | null;
  meetingUrl: string | null;
  recordingUrl: string | null;
  materialsUrl: string | null;
  isFeatured: boolean;
  isPublished: boolean;
  registrationDeadline: Timestamp | null;
  registrationCount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CategoryDoc {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  sortOrder: number;
  courseCount: number;
  workshopCount: number;
  createdAt: Timestamp;
}

export interface CertificateDoc {
  id: string;
  odUserId: string;
  certificateType: "course" | "learning_path" | "workshop" | "assessment";
  courseId: string | null;
  learningPathId: string | null;
  workshopId: string | null;
  assessmentId: string | null;
  title: string;
  recipientName: string;
  issuedAt: Timestamp;
  certificateNumber: string;
  pdfUrl: string | null;
  verificationUrl: string | null;
}

// Gamification
export interface BadgeDoc {
  id: string;
  name: string;
  description: string;
  iconUrl: string | null;
  iconEmoji: string | null;
  category: "achievement" | "milestone" | "streak" | "special";
  requirement: string;
  pointsAwarded: number;
  isActive: boolean;
  createdAt: Timestamp;
}

export interface UserBadgeDoc {
  id: string;
  userId: string;
  badgeId: string;
  earnedAt: Timestamp;
}

export interface UserPointsDoc {
  id: string; // Same as odUserId
  odUserId: string;
  totalPoints: number;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: Timestamp | null;
  coursesCompleted: number;
  lessonsCompleted: number;
  workshopsAttended: number;
  certificatesEarned: number;
  totalLearningMinutes: number;
  level: number;
  updatedAt: Timestamp;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function generateCertificateNumber(): string {
  const prefix = "L83";
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

// ============================================================================
// CATEGORY OPERATIONS
// ============================================================================

export async function createCategory(data: {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  sortOrder?: number;
}): Promise<CategoryDoc> {
  if (!db) throw new Error("Firebase not initialized");

  const categoriesRef = collection(db, LMS_COLLECTIONS.CATEGORIES);
  const newDocRef = doc(categoriesRef);

  const categoryDoc: CategoryDoc = {
    id: newDocRef.id,
    name: data.name,
    slug: generateSlug(data.name),
    description: data.description || null,
    icon: data.icon || null,
    color: data.color || null,
    sortOrder: data.sortOrder || 0,
    courseCount: 0,
    workshopCount: 0,
    createdAt: Timestamp.now(),
  };

  await setDoc(newDocRef, categoryDoc);
  return categoryDoc;
}

export async function getCategories(): Promise<CategoryDoc[]> {
  if (!db) throw new Error("Firebase not initialized");

  const categoriesRef = collection(db, LMS_COLLECTIONS.CATEGORIES);
  const q = query(categoriesRef, orderBy("sortOrder", "asc"));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => doc.data() as CategoryDoc);
}

export async function updateCategory(
  categoryId: string,
  updates: Partial<Omit<CategoryDoc, "id" | "createdAt">>
): Promise<void> {
  if (!db) throw new Error("Firebase not initialized");

  const docRef = doc(db, LMS_COLLECTIONS.CATEGORIES, categoryId);
  await updateDoc(docRef, updates);
}

export async function deleteCategory(categoryId: string): Promise<void> {
  if (!db) throw new Error("Firebase not initialized");

  const docRef = doc(db, LMS_COLLECTIONS.CATEGORIES, categoryId);
  await deleteDoc(docRef);
}

// ============================================================================
// COURSE OPERATIONS
// ============================================================================

export async function createCourse(data: {
  title: string;
  description?: string;
  shortDescription?: string;
  categoryId?: string;
  instructorName: string;
  instructorBio?: string;
  difficultyLevel: DifficultyLevel;
  estimatedDurationMinutes?: number;
  tags?: string[];
  learningOutcomes?: string[];
  prerequisites?: string[];
  isFeatured?: boolean;
  priceInCents?: number;
  compareAtPriceInCents?: number;
  isFree?: boolean;
}): Promise<CourseDoc> {
  if (!db) throw new Error("Firebase not initialized");

  const coursesRef = collection(db, LMS_COLLECTIONS.COURSES);
  const newDocRef = doc(coursesRef);

  const courseDoc: CourseDoc = {
    id: newDocRef.id,
    title: data.title,
    slug: generateSlug(data.title),
    description: data.description || null,
    shortDescription: data.shortDescription || null,
    thumbnailUrl: null,
    thumbnailImageId: null,
    previewVideoUrl: null,
    categoryId: data.categoryId || null,
    instructorName: data.instructorName,
    instructorBio: data.instructorBio || null,
    instructorImageUrl: null,
    difficultyLevel: data.difficultyLevel,
    estimatedDurationMinutes: data.estimatedDurationMinutes || null,
    minSubscriptionTierId: null,
    isFeatured: data.isFeatured || false,
    isPublished: false,
    publishedAt: null,
    tags: data.tags || [],
    learningOutcomes: data.learningOutcomes || [],
    prerequisites: data.prerequisites || [],
    enrollmentCount: 0,
    priceInCents: data.priceInCents || 0,
    compareAtPriceInCents: data.compareAtPriceInCents || null,
    isFree: data.isFree ?? true,
    stripePriceId: null,
    stripeProductId: null,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  await setDoc(newDocRef, courseDoc);

  // Update category course count
  if (data.categoryId) {
    const categoryRef = doc(db, LMS_COLLECTIONS.CATEGORIES, data.categoryId);
    await updateDoc(categoryRef, { courseCount: increment(1) });
  }

  return courseDoc;
}

export async function getCourse(courseId: string): Promise<CourseDoc | null> {
  if (!db) throw new Error("Firebase not initialized");

  const docRef = doc(db, LMS_COLLECTIONS.COURSES, courseId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) return null;
  return docSnap.data() as CourseDoc;
}

export async function getCourseBySlug(slug: string): Promise<CourseDoc | null> {
  if (!db) throw new Error("Firebase not initialized");

  const coursesRef = collection(db, LMS_COLLECTIONS.COURSES);
  const q = query(coursesRef, where("slug", "==", slug), limit(1));
  const snapshot = await getDocs(q);

  if (snapshot.empty) return null;
  return snapshot.docs[0].data() as CourseDoc;
}

export async function getCourses(options?: {
  categoryId?: string;
  isPublished?: boolean;
  isFeatured?: boolean;
  limitCount?: number;
}): Promise<CourseDoc[]> {
  if (!db) throw new Error("Firebase not initialized");

  const coursesRef = collection(db, LMS_COLLECTIONS.COURSES);
  const constraints = [];

  // Build query constraints (orderBy must match where field to avoid composite index)
  if (options?.isPublished !== undefined) {
    constraints.push(where("isPublished", "==", options.isPublished));
  }
  if (options?.categoryId) {
    constraints.push(where("categoryId", "==", options.categoryId));
  }
  if (options?.isFeatured) {
    constraints.push(where("isFeatured", "==", true));
  }
  
  // Use createdAt order only when no other filters (avoids composite index)
  if (constraints.length === 0) {
    constraints.push(orderBy("createdAt", "desc"));
  }
  
  if (options?.limitCount) {
    constraints.push(limit(options.limitCount));
  }

  const q = query(coursesRef, ...constraints);
  const snapshot = await getDocs(q);
  
  // Sort by createdAt client-side if we have other filters (avoids composite index requirement)
  const courses = snapshot.docs.map((doc) => doc.data() as CourseDoc);
  
  if (constraints.length > 0 && !constraints.some(c => c.type === 'orderBy')) {
    courses.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
  }
  
  return courses;
}

export async function updateCourse(
  courseId: string,
  updates: Partial<Omit<CourseDoc, "id" | "createdAt">>
): Promise<void> {
  if (!db) throw new Error("Firebase not initialized");

  const docRef = doc(db, LMS_COLLECTIONS.COURSES, courseId);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

export async function publishCourse(courseId: string): Promise<void> {
  if (!db) throw new Error("Firebase not initialized");

  const docRef = doc(db, LMS_COLLECTIONS.COURSES, courseId);
  await updateDoc(docRef, {
    isPublished: true,
    publishedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteCourse(courseId: string): Promise<void> {
  if (!db) throw new Error("Firebase not initialized");

  // Get course to check category
  const course = await getCourse(courseId);
  
  // Delete course
  const docRef = doc(db, LMS_COLLECTIONS.COURSES, courseId);
  await deleteDoc(docRef);

  // Update category count
  if (course?.categoryId) {
    const categoryRef = doc(db, LMS_COLLECTIONS.CATEGORIES, course.categoryId);
    await updateDoc(categoryRef, { courseCount: increment(-1) });
  }
}

// ============================================================================
// MODULE & LESSON OPERATIONS
// ============================================================================

export async function createModule(data: {
  courseId: string;
  title: string;
  description?: string;
  sortOrder?: number;
}): Promise<CourseModuleDoc> {
  if (!db) throw new Error("Firebase not initialized");

  const modulesRef = collection(db, LMS_COLLECTIONS.COURSE_MODULES);
  const newDocRef = doc(modulesRef);

  const moduleDoc: CourseModuleDoc = {
    id: newDocRef.id,
    courseId: data.courseId,
    title: data.title,
    description: data.description || null,
    sortOrder: data.sortOrder || 0,
    createdAt: Timestamp.now(),
  };

  await setDoc(newDocRef, moduleDoc);
  return moduleDoc;
}

export async function getModules(courseId: string): Promise<CourseModuleDoc[]> {
  if (!db) throw new Error("Firebase not initialized");

  const modulesRef = collection(db, LMS_COLLECTIONS.COURSE_MODULES);
  const q = query(
    modulesRef,
    where("courseId", "==", courseId),
    orderBy("sortOrder", "asc")
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => doc.data() as CourseModuleDoc);
}

export async function createLesson(data: {
  moduleId: string;
  courseId: string;
  title: string;
  description?: string | null;
  contentType: ContentType;
  videoUrl?: string | null;
  videoDurationSeconds?: number | null;
  textContent?: string | null;
  downloadUrl?: string | null;
  imageId?: string | null;
  imageUrl?: string | null;
  isPreview?: boolean;
  sortOrder?: number;
}): Promise<LessonDoc> {
  if (!db) throw new Error("Firebase not initialized");

  const lessonsRef = collection(db, LMS_COLLECTIONS.LESSONS);
  const newDocRef = doc(lessonsRef);

  const lessonDoc: LessonDoc = {
    id: newDocRef.id,
    moduleId: data.moduleId,
    courseId: data.courseId,
    title: data.title,
    slug: generateSlug(data.title),
    description: data.description || null,
    contentType: data.contentType,
    videoUrl: data.videoUrl || null,
    videoDurationSeconds: data.videoDurationSeconds || null,
    textContent: data.textContent || null,
    downloadUrl: data.downloadUrl || null,
    imageId: data.imageId || null,
    imageUrl: data.imageUrl || null,
    isPreview: data.isPreview || false,
    sortOrder: data.sortOrder || 0,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  await setDoc(newDocRef, lessonDoc);
  return lessonDoc;
}

export async function getLessons(moduleId: string): Promise<LessonDoc[]> {
  if (!db) throw new Error("Firebase not initialized");

  const lessonsRef = collection(db, LMS_COLLECTIONS.LESSONS);
  const q = query(
    lessonsRef,
    where("moduleId", "==", moduleId),
    orderBy("sortOrder", "asc")
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => doc.data() as LessonDoc);
}

export async function getCourseLessons(courseId: string): Promise<LessonDoc[]> {
  if (!db) throw new Error("Firebase not initialized");

  const lessonsRef = collection(db, LMS_COLLECTIONS.LESSONS);
  const q = query(
    lessonsRef,
    where("courseId", "==", courseId),
    orderBy("sortOrder", "asc")
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => doc.data() as LessonDoc);
}

export async function updateLesson(
  lessonId: string,
  updates: Partial<Omit<LessonDoc, "id" | "createdAt">>
): Promise<void> {
  if (!db) throw new Error("Firebase not initialized");

  // Filter out undefined values - Firestore doesn't accept undefined
  const filteredUpdates: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) {
      filteredUpdates[key] = value;
    }
  }

  const docRef = doc(db, LMS_COLLECTIONS.LESSONS, lessonId);
  await updateDoc(docRef, {
    ...filteredUpdates,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteLesson(lessonId: string): Promise<void> {
  if (!db) throw new Error("Firebase not initialized");

  const docRef = doc(db, LMS_COLLECTIONS.LESSONS, lessonId);
  await deleteDoc(docRef);
}

export async function getModule(moduleId: string): Promise<CourseModuleDoc | null> {
  if (!db) throw new Error("Firebase not initialized");

  const docRef = doc(db, LMS_COLLECTIONS.COURSE_MODULES, moduleId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) return null;
  return docSnap.data() as CourseModuleDoc;
}

export async function updateModule(
  moduleId: string,
  updates: Partial<Omit<CourseModuleDoc, "id" | "createdAt">>
): Promise<void> {
  if (!db) throw new Error("Firebase not initialized");

  const docRef = doc(db, LMS_COLLECTIONS.COURSE_MODULES, moduleId);
  await updateDoc(docRef, updates);
}

export async function deleteModule(moduleId: string): Promise<void> {
  if (!db) throw new Error("Firebase not initialized");

  // Delete all lessons in this module first
  const lessons = await getLessons(moduleId);
  const batch = writeBatch(db);
  
  for (const lesson of lessons) {
    const lessonRef = doc(db, LMS_COLLECTIONS.LESSONS, lesson.id);
    batch.delete(lessonRef);
  }
  
  // Delete the module
  const moduleRef = doc(db, LMS_COLLECTIONS.COURSE_MODULES, moduleId);
  batch.delete(moduleRef);
  
  await batch.commit();
}

export async function reorderModules(
  courseId: string,
  moduleIds: string[]
): Promise<void> {
  if (!db) throw new Error("Firebase not initialized");

  const batch = writeBatch(db);
  
  moduleIds.forEach((moduleId, index) => {
    const moduleRef = doc(db!, LMS_COLLECTIONS.COURSE_MODULES, moduleId);
    batch.update(moduleRef, { sortOrder: index });
  });
  
  await batch.commit();
}

export async function reorderLessons(
  moduleId: string,
  lessonIds: string[]
): Promise<void> {
  if (!db) throw new Error("Firebase not initialized");

  const batch = writeBatch(db);
  
  lessonIds.forEach((lessonId, index) => {
    const lessonRef = doc(db!, LMS_COLLECTIONS.LESSONS, lessonId);
    batch.update(lessonRef, { sortOrder: index });
  });
  
  await batch.commit();
}

export async function getLesson(lessonId: string): Promise<LessonDoc | null> {
  if (!db) throw new Error("Firebase not initialized");

  const docRef = doc(db, LMS_COLLECTIONS.LESSONS, lessonId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) return null;
  return docSnap.data() as LessonDoc;
}

export async function getCourseWithModulesAndLessons(courseId: string): Promise<{
  course: CourseDoc;
  modules: (CourseModuleDoc & { lessons: LessonDoc[] })[];
} | null> {
  if (!db) throw new Error("Firebase not initialized");

  const course = await getCourse(courseId);
  if (!course) return null;

  const modules = await getModules(courseId);
  const modulesWithLessons = await Promise.all(
    modules.map(async (module) => {
      const lessons = await getLessons(module.id);
      return { ...module, lessons };
    })
  );

  return { course, modules: modulesWithLessons };
}

// ============================================================================
// ENROLLMENT & PROGRESS OPERATIONS
// ============================================================================

export async function enrollInCourse(
  userId: string,
  courseId: string
): Promise<EnrollmentDoc> {
  if (!db) throw new Error("Firebase not initialized");

  // Check if already enrolled
  const existingEnrollment = await getEnrollment(userId, courseId);
  if (existingEnrollment) {
    return existingEnrollment;
  }

  const enrollmentsRef = collection(db, LMS_COLLECTIONS.ENROLLMENTS);
  const newDocRef = doc(enrollmentsRef);

  const enrollmentDoc: EnrollmentDoc = {
    id: newDocRef.id,
    userId,
    courseId,
    enrolledAt: Timestamp.now(),
    completedAt: null,
    progressPercentage: 0,
    lastAccessedAt: null,
    certificateIssuedAt: null,
    certificateId: null,
  };

  await setDoc(newDocRef, enrollmentDoc);

  // Update course enrollment count
  const courseRef = doc(db, LMS_COLLECTIONS.COURSES, courseId);
  await updateDoc(courseRef, { enrollmentCount: increment(1) });

  return enrollmentDoc;
}

export async function getEnrollment(
  userId: string,
  courseId: string
): Promise<EnrollmentDoc | null> {
  if (!db) throw new Error("Firebase not initialized");

  const enrollmentsRef = collection(db, LMS_COLLECTIONS.ENROLLMENTS);
  const q = query(
    enrollmentsRef,
    where("userId", "==", userId),
    where("courseId", "==", courseId),
    limit(1)
  );
  const snapshot = await getDocs(q);

  if (snapshot.empty) return null;
  return snapshot.docs[0].data() as EnrollmentDoc;
}

export async function getUserEnrollments(userId: string): Promise<EnrollmentDoc[]> {
  if (!db) throw new Error("Firebase not initialized");

  const enrollmentsRef = collection(db, LMS_COLLECTIONS.ENROLLMENTS);
  const q = query(
    enrollmentsRef,
    where("userId", "==", userId),
    orderBy("enrolledAt", "desc")
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => doc.data() as EnrollmentDoc);
}

export async function updateLessonProgress(data: {
  odUserId: string;
  lessonId: string;
  courseId: string;
  enrollmentId: string;
  progressSeconds?: number;
  isCompleted?: boolean;
  notes?: string;
}): Promise<LessonProgressDoc> {
  if (!db) throw new Error("Firebase not initialized");

  const progressRef = collection(db, LMS_COLLECTIONS.LESSON_PROGRESS);
  const q = query(
    progressRef,
    where("odUserId", "==", data.odUserId),
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
      odUserId: data.odUserId,
      lessonId: data.lessonId,
      courseId: data.courseId,
      enrollmentId: data.enrollmentId,
      startedAt: Timestamp.now(),
      completedAt: data.isCompleted ? Timestamp.now() : null,
      progressSeconds: data.progressSeconds || 0,
      isCompleted: data.isCompleted || false,
      notes: data.notes || null,
    };
    await setDoc(newDocRef, progressDoc);
  } else {
    // Update existing progress
    const existingDoc = snapshot.docs[0];
    const updates: Partial<LessonProgressDoc> = {};
    
    if (data.progressSeconds !== undefined) {
      updates.progressSeconds = data.progressSeconds;
    }
    if (data.isCompleted !== undefined) {
      updates.isCompleted = data.isCompleted;
      if (data.isCompleted) {
        updates.completedAt = Timestamp.now();
      }
    }
    if (data.notes !== undefined) {
      updates.notes = data.notes;
    }

    await updateDoc(existingDoc.ref, updates);
    progressDoc = { ...existingDoc.data(), ...updates } as LessonProgressDoc;
  }

  // Update enrollment progress
  await updateEnrollmentProgress(data.enrollmentId, data.courseId);

  // Award points if lesson completed
  if (data.isCompleted) {
    await awardPoints(data.odUserId, 10, "lesson_completed");
  }

  return progressDoc;
}

async function updateEnrollmentProgress(
  enrollmentId: string,
  courseId: string
): Promise<void> {
  if (!db) throw new Error("Firebase not initialized");

  // Get total lessons for course
  const lessons = await getCourseLessons(courseId);
  const totalLessons = lessons.length;

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
  const updates: Partial<EnrollmentDoc> = {
    progressPercentage,
    lastAccessedAt: Timestamp.now(),
  };

  // Check if course is completed
  if (progressPercentage === 100) {
    updates.completedAt = Timestamp.now();
  }

  await updateDoc(enrollmentRef, updates);
}

// ============================================================================
// WORKSHOP OPERATIONS
// ============================================================================

export async function createWorkshop(data: {
  title: string;
  description?: string;
  shortDescription?: string;
  workshopType: WorkshopType;
  categoryId?: string;
  instructorName: string;
  scheduledStart?: Date;
  scheduledEnd?: Date;
  timezone?: string;
  maxParticipants?: number;
  meetingUrl?: string;
  isFeatured?: boolean;
}): Promise<WorkshopDoc> {
  if (!db) throw new Error("Firebase not initialized");

  const workshopsRef = collection(db, LMS_COLLECTIONS.WORKSHOPS);
  const newDocRef = doc(workshopsRef);

  const workshopDoc: WorkshopDoc = {
    id: newDocRef.id,
    title: data.title,
    slug: generateSlug(data.title),
    description: data.description || null,
    shortDescription: data.shortDescription || null,
    thumbnailUrl: null,
    thumbnailImageId: null,
    workshopType: data.workshopType,
    categoryId: data.categoryId || null,
    instructorName: data.instructorName,
    scheduledStart: data.scheduledStart ? Timestamp.fromDate(data.scheduledStart) : null,
    scheduledEnd: data.scheduledEnd ? Timestamp.fromDate(data.scheduledEnd) : null,
    timezone: data.timezone || "America/New_York",
    maxParticipants: data.maxParticipants || null,
    minSubscriptionTierId: null,
    meetingUrl: data.meetingUrl || null,
    recordingUrl: null,
    materialsUrl: null,
    isFeatured: data.isFeatured || false,
    isPublished: false,
    registrationDeadline: null,
    registrationCount: 0,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  await setDoc(newDocRef, workshopDoc);

  // Update category workshop count
  if (data.categoryId) {
    const categoryRef = doc(db, LMS_COLLECTIONS.CATEGORIES, data.categoryId);
    await updateDoc(categoryRef, { workshopCount: increment(1) });
  }

  return workshopDoc;
}

export async function getWorkshops(options?: {
  workshopType?: WorkshopType;
  isPublished?: boolean;
  upcoming?: boolean;
  limitCount?: number;
}): Promise<WorkshopDoc[]> {
  if (!db) throw new Error("Firebase not initialized");

  const workshopsRef = collection(db, LMS_COLLECTIONS.WORKSHOPS);
  const constraints = [];

  // Build query constraints (orderBy must match where field to avoid composite index)
  if (options?.isPublished !== undefined) {
    constraints.push(where("isPublished", "==", options.isPublished));
  }
  if (options?.workshopType) {
    constraints.push(where("workshopType", "==", options.workshopType));
  }
  if (options?.upcoming) {
    constraints.push(where("scheduledStart", ">=", Timestamp.now()));
  }
  
  // Use scheduledStart order only when no other filters (avoids composite index)
  if (constraints.length === 0) {
    constraints.push(orderBy("scheduledStart", "asc"));
  }
  
  if (options?.limitCount) {
    constraints.push(limit(options.limitCount));
  }

  const q = query(workshopsRef, ...constraints);
  const snapshot = await getDocs(q);
  
  // Sort by scheduledStart client-side if we have other filters (avoids composite index requirement)
  const workshops = snapshot.docs.map((doc) => doc.data() as WorkshopDoc);
  
  if (constraints.length > 0 && !constraints.some(c => c.type === 'orderBy')) {
    workshops.sort((a, b) => {
      if (!a.scheduledStart || !b.scheduledStart) return 0;
      return a.scheduledStart.toMillis() - b.scheduledStart.toMillis();
    });
  }
  
  return workshops;
}

export async function updateWorkshop(
  workshopId: string,
  updates: Partial<Omit<WorkshopDoc, "id" | "createdAt">>
): Promise<void> {
  if (!db) throw new Error("Firebase not initialized");

  const docRef = doc(db, LMS_COLLECTIONS.WORKSHOPS, workshopId);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteWorkshop(workshopId: string): Promise<void> {
  if (!db) throw new Error("Firebase not initialized");

  const docRef = doc(db, LMS_COLLECTIONS.WORKSHOPS, workshopId);
  await deleteDoc(docRef);
}

export async function registerForWorkshop(
  userId: string,
  workshopId: string
): Promise<void> {
  if (!db) throw new Error("Firebase not initialized");

  const registrationsRef = collection(db, LMS_COLLECTIONS.WORKSHOP_REGISTRATIONS);
  const newDocRef = doc(registrationsRef);

  await setDoc(newDocRef, {
    id: newDocRef.id,
    userId,
    workshopId,
    registeredAt: Timestamp.now(),
    attended: false,
    attendanceDurationMinutes: null,
    feedbackRating: null,
    feedbackText: null,
    reminderSent: false,
  });

  // Update registration count
  const workshopRef = doc(db, LMS_COLLECTIONS.WORKSHOPS, workshopId);
  await updateDoc(workshopRef, { registrationCount: increment(1) });
}

// ============================================================================
// CERTIFICATE OPERATIONS
// ============================================================================

export async function issueCertificate(data: {
  odUserId: string;
  certificateType: "course" | "learning_path" | "workshop" | "assessment";
  courseId?: string;
  learningPathId?: string;
  workshopId?: string;
  assessmentId?: string;
  title: string;
  recipientName: string;
}): Promise<CertificateDoc> {
  if (!db) throw new Error("Firebase not initialized");

  const certificatesRef = collection(db, LMS_COLLECTIONS.CERTIFICATES);
  const newDocRef = doc(certificatesRef);

  const certificateDoc: CertificateDoc = {
    id: newDocRef.id,
    odUserId: data.odUserId,
    certificateType: data.certificateType,
    courseId: data.courseId || null,
    learningPathId: data.learningPathId || null,
    workshopId: data.workshopId || null,
    assessmentId: data.assessmentId || null,
    title: data.title,
    recipientName: data.recipientName,
    issuedAt: Timestamp.now(),
    certificateNumber: generateCertificateNumber(),
    pdfUrl: null,
    verificationUrl: null,
  };

  await setDoc(newDocRef, certificateDoc);

  // Update enrollment if course certificate
  if (data.courseId) {
    const enrollmentsRef = collection(db, LMS_COLLECTIONS.ENROLLMENTS);
    const q = query(
      enrollmentsRef,
      where("userId", "==", data.odUserId),
      where("courseId", "==", data.courseId),
      limit(1)
    );
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      await updateDoc(snapshot.docs[0].ref, {
        certificateIssuedAt: Timestamp.now(),
        certificateId: certificateDoc.id,
      });
    }
  }

  // Award points
  await awardPoints(data.odUserId, 100, "certificate_earned");

  return certificateDoc;
}

export async function getUserCertificates(userId: string): Promise<CertificateDoc[]> {
  if (!db) throw new Error("Firebase not initialized");

  const certificatesRef = collection(db, LMS_COLLECTIONS.CERTIFICATES);
  const q = query(
    certificatesRef,
    where("odUserId", "==", userId),
    orderBy("issuedAt", "desc")
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => doc.data() as CertificateDoc);
}

export async function verifyCertificate(
  certificateNumber: string
): Promise<CertificateDoc | null> {
  if (!db) throw new Error("Firebase not initialized");

  const certificatesRef = collection(db, LMS_COLLECTIONS.CERTIFICATES);
  const q = query(
    certificatesRef,
    where("certificateNumber", "==", certificateNumber),
    limit(1)
  );
  const snapshot = await getDocs(q);

  if (snapshot.empty) return null;
  return snapshot.docs[0].data() as CertificateDoc;
}

// ============================================================================
// GAMIFICATION OPERATIONS
// ============================================================================

export async function awardPoints(
  userId: string,
  points: number,
  reason: string
): Promise<void> {
  if (!db) throw new Error("Firebase not initialized");

  const userPointsRef = doc(db, LMS_COLLECTIONS.USER_POINTS, userId);
  const userPointsSnap = await getDoc(userPointsRef);

  if (userPointsSnap.exists()) {
    await updateDoc(userPointsRef, {
      totalPoints: increment(points),
      updatedAt: serverTimestamp(),
    });
  } else {
    const userPointsDoc: UserPointsDoc = {
      id: userId,
      odUserId: userId,
      totalPoints: points,
      currentStreak: 0,
      longestStreak: 0,
      lastActivityDate: Timestamp.now(),
      coursesCompleted: 0,
      lessonsCompleted: 0,
      workshopsAttended: 0,
      certificatesEarned: 0,
      totalLearningMinutes: 0,
      level: 1,
      updatedAt: Timestamp.now(),
    };
    await setDoc(userPointsRef, userPointsDoc);
  }
}

export async function getUserPoints(userId: string): Promise<UserPointsDoc | null> {
  if (!db) throw new Error("Firebase not initialized");

  const userPointsRef = doc(db, LMS_COLLECTIONS.USER_POINTS, userId);
  const userPointsSnap = await getDoc(userPointsRef);

  if (!userPointsSnap.exists()) return null;
  return userPointsSnap.data() as UserPointsDoc;
}

export async function awardBadge(userId: string, badgeId: string): Promise<void> {
  if (!db) throw new Error("Firebase not initialized");

  // Check if already has badge
  const userBadgesRef = collection(db, LMS_COLLECTIONS.USER_BADGES);
  const q = query(
    userBadgesRef,
    where("userId", "==", userId),
    where("badgeId", "==", badgeId),
    limit(1)
  );
  const snapshot = await getDocs(q);

  if (!snapshot.empty) return; // Already has badge

  const newDocRef = doc(userBadgesRef);
  await setDoc(newDocRef, {
    id: newDocRef.id,
    userId,
    badgeId,
    earnedAt: Timestamp.now(),
  });

  // Get badge to award points
  const badgeRef = doc(db, LMS_COLLECTIONS.BADGES, badgeId);
  const badgeSnap = await getDoc(badgeRef);
  if (badgeSnap.exists()) {
    const badge = badgeSnap.data() as BadgeDoc;
    await awardPoints(userId, badge.pointsAwarded, `badge_${badge.name}`);
  }
}

export async function getUserBadges(userId: string): Promise<BadgeDoc[]> {
  if (!db) throw new Error("Firebase not initialized");

  const userBadgesRef = collection(db, LMS_COLLECTIONS.USER_BADGES);
  const q = query(userBadgesRef, where("userId", "==", userId));
  const snapshot = await getDocs(q);

  const badgeIds = snapshot.docs.map((doc) => (doc.data() as UserBadgeDoc).badgeId);
  
  if (badgeIds.length === 0) return [];

  const badges: BadgeDoc[] = [];
  for (const badgeId of badgeIds) {
    const badgeRef = doc(db, LMS_COLLECTIONS.BADGES, badgeId);
    const badgeSnap = await getDoc(badgeRef);
    if (badgeSnap.exists()) {
      badges.push(badgeSnap.data() as BadgeDoc);
    }
  }

  return badges;
}

export async function createBadge(data: {
  name: string;
  description: string;
  iconEmoji?: string;
  category: "achievement" | "milestone" | "streak" | "special";
  requirement: string;
  pointsAwarded: number;
}): Promise<BadgeDoc> {
  if (!db) throw new Error("Firebase not initialized");

  const badgesRef = collection(db, LMS_COLLECTIONS.BADGES);
  const newDocRef = doc(badgesRef);

  const badgeDoc: BadgeDoc = {
    id: newDocRef.id,
    name: data.name,
    description: data.description,
    iconUrl: null,
    iconEmoji: data.iconEmoji || "🏆",
    category: data.category,
    requirement: data.requirement,
    pointsAwarded: data.pointsAwarded,
    isActive: true,
    createdAt: Timestamp.now(),
  };

  await setDoc(newDocRef, badgeDoc);
  return badgeDoc;
}

export async function getBadges(): Promise<BadgeDoc[]> {
  if (!db) throw new Error("Firebase not initialized");

  const badgesRef = collection(db, LMS_COLLECTIONS.BADGES);
  const q = query(badgesRef, where("isActive", "==", true));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => doc.data() as BadgeDoc);
}

// ============================================================================
// ACADEMY STATS
// ============================================================================

export async function getAcademyStats(): Promise<{
  totalCourses: number;
  totalLessons: number;
  totalWorkshops: number;
  totalEnrollments: number;
  totalCertificates: number;
}> {
  if (!db) throw new Error("Firebase not initialized");

  const [courses, lessons, workshops, enrollments, certificates] = await Promise.all([
    getDocs(collection(db, LMS_COLLECTIONS.COURSES)),
    getDocs(collection(db, LMS_COLLECTIONS.LESSONS)),
    getDocs(collection(db, LMS_COLLECTIONS.WORKSHOPS)),
    getDocs(collection(db, LMS_COLLECTIONS.ENROLLMENTS)),
    getDocs(collection(db, LMS_COLLECTIONS.CERTIFICATES)),
  ]);

  return {
    totalCourses: courses.size,
    totalLessons: lessons.size,
    totalWorkshops: workshops.size,
    totalEnrollments: enrollments.size,
    totalCertificates: certificates.size,
  };
}

// ============================================================================
// REAL-TIME SUBSCRIPTIONS
// ============================================================================

export function subscribeToCourses(
  callback: (courses: CourseDoc[]) => void,
  options?: { isPublished?: boolean }
): () => void {
  if (!db) {
    console.error("Firebase not initialized");
    return () => {};
  }

  const coursesRef = collection(db, LMS_COLLECTIONS.COURSES);
  let q = query(coursesRef, orderBy("createdAt", "desc"));

  if (options?.isPublished !== undefined) {
    q = query(q, where("isPublished", "==", options.isPublished));
  }

  return onSnapshot(q, (snapshot) => {
    const courses = snapshot.docs.map((doc) => doc.data() as CourseDoc);
    callback(courses);
  });
}

export function subscribeToWorkshops(
  callback: (workshops: WorkshopDoc[]) => void,
  options?: { upcoming?: boolean }
): () => void {
  if (!db) {
    console.error("Firebase not initialized");
    return () => {};
  }

  const workshopsRef = collection(db, LMS_COLLECTIONS.WORKSHOPS);
  let q = query(workshopsRef, orderBy("scheduledStart", "asc"));

  if (options?.upcoming) {
    q = query(q, where("scheduledStart", ">=", Timestamp.now()));
  }

  return onSnapshot(q, (snapshot) => {
    const workshops = snapshot.docs.map((doc) => doc.data() as WorkshopDoc);
    callback(workshops);
  });
}

// ============================================================================
// COURSE PURCHASE OPERATIONS
// ============================================================================

export async function getUserPurchases(userId: string): Promise<CoursePurchaseDoc[]> {
  if (!db) throw new Error("Firebase not initialized");

  const purchasesRef = collection(db, LMS_COLLECTIONS.COURSE_PURCHASES);
  const q = query(
    purchasesRef,
    where("odUserId", "==", userId),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => doc.data() as CoursePurchaseDoc);
}

export async function getPurchase(purchaseId: string): Promise<CoursePurchaseDoc | null> {
  if (!db) throw new Error("Firebase not initialized");

  const docRef = doc(db, LMS_COLLECTIONS.COURSE_PURCHASES, purchaseId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) return null;
  return docSnap.data() as CoursePurchaseDoc;
}

export async function hasUserPurchasedCourse(userId: string, courseId: string): Promise<boolean> {
  if (!db) throw new Error("Firebase not initialized");

  const purchasesRef = collection(db, LMS_COLLECTIONS.COURSE_PURCHASES);
  const q = query(
    purchasesRef,
    where("odUserId", "==", userId),
    where("courseId", "==", courseId),
    where("paymentStatus", "==", "paid"),
    limit(1)
  );
  const snapshot = await getDocs(q);

  return !snapshot.empty;
}

export async function getAllPurchases(): Promise<CoursePurchaseDoc[]> {
  if (!db) throw new Error("Firebase not initialized");

  const purchasesRef = collection(db, LMS_COLLECTIONS.COURSE_PURCHASES);
  const q = query(purchasesRef, orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => doc.data() as CoursePurchaseDoc);
}

export async function getPurchaseStats(): Promise<{
  totalRevenue: number;
  totalPurchases: number;
  paidPurchases: number;
  pendingPurchases: number;
  refundedPurchases: number;
}> {
  if (!db) throw new Error("Firebase not initialized");

  const purchases = await getAllPurchases();
  
  return {
    totalRevenue: purchases
      .filter(p => p.paymentStatus === "paid")
      .reduce((acc, p) => acc + p.totalInCents, 0),
    totalPurchases: purchases.length,
    paidPurchases: purchases.filter(p => p.paymentStatus === "paid").length,
    pendingPurchases: purchases.filter(p => p.paymentStatus === "pending").length,
    refundedPurchases: purchases.filter(p => p.paymentStatus === "refunded").length,
  };
}
