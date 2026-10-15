/**
 * Firebase Academy API Service
 * Client-side Firestore operations for Adams Electric Academy
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
  DocumentData,
  QueryConstraint,
} from "firebase/firestore";
import { db } from "./firebase";

// ============================================================================
// TYPES
// ============================================================================

export interface SubscriptionTier {
  id: string;
  name: string;
  slug: string;
  description: string;
  priceMonthly: number;
  priceAnnual: number;
  features: string[];
  isActive: boolean;
  sortOrder: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CourseCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  color: string;
  sortOrder: number;
  createdAt: Timestamp;
}

export interface Course {
  id: string;
  title: string;
  slug: string;
  description: string;
  shortDescription: string;
  thumbnailUrl?: string;
  previewVideoUrl?: string;
  categoryId: string;
  instructorName: string;
  instructorBio?: string;
  instructorImageUrl?: string;
  difficultyLevel: "beginner" | "intermediate" | "advanced";
  estimatedDurationMinutes: number;
  minSubscriptionTierId?: string;
  isFeatured: boolean;
  isPublished: boolean;
  publishedAt?: Timestamp;
  tags: string[];
  learningOutcomes: string[];
  prerequisites: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Workshop {
  id: string;
  title: string;
  slug: string;
  description: string;
  shortDescription: string;
  thumbnailUrl?: string;
  workshopType: "live" | "recorded" | "hybrid";
  categoryId: string;
  instructorName: string;
  scheduledStart?: Timestamp;
  scheduledEnd?: Timestamp;
  timezone: string;
  maxParticipants?: number;
  minSubscriptionTierId?: string;
  meetingUrl?: string;
  recordingUrl?: string;
  materialsUrl?: string;
  isFeatured: boolean;
  isPublished: boolean;
  registrationDeadline?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CourseEnrollment {
  id: string;
  userId: string;
  courseId: string;
  enrolledAt: Timestamp;
  completedAt?: Timestamp;
  progressPercentage: number;
  lastAccessedAt?: Timestamp;
  certificateIssuedAt?: Timestamp;
  certificateUrl?: string;
}

export interface WorkshopRegistration {
  id: string;
  userId: string;
  workshopId: string;
  registeredAt: Timestamp;
  attended: boolean;
  attendanceDurationMinutes?: number;
  feedbackRating?: number;
  feedbackText?: string;
  reminderSent: boolean;
}

export interface QuizLead {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  totalScore: number;
  scoreLevel: string;
  answers: Record<number, number>;
  createdAt: Timestamp;
}

export interface QuizResult {
  id: string;
  leadId?: string;
  totalScore: number;
  maxScore: number;
  percentage: number;
  scoreLevel: string;
  categoryScores: Record<string, number>;
  topStrength: string;
  topWeakness: string;
  createdAt: Timestamp;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function convertTimestamps<T extends DocumentData>(data: T): T {
  const converted = { ...data };
  for (const key in converted) {
    const value = converted[key] as unknown;
    if (value && typeof value === 'object' && value instanceof Timestamp) {
      // Keep as Timestamp for Firestore compatibility
    }
  }
  return converted;
}

// ============================================================================
// SUBSCRIPTION TIERS
// ============================================================================

export async function getSubscriptionTiers(): Promise<SubscriptionTier[]> {
  if (!db) return [];
  
  const q = query(
    collection(db, "subscriptionTiers"),
    where("isActive", "==", true),
    orderBy("sortOrder", "asc")
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as SubscriptionTier[];
}

export async function getSubscriptionTier(tierId: string): Promise<SubscriptionTier | null> {
  if (!db) return null;
  
  const docRef = doc(db, "subscriptionTiers", tierId);
  const snapshot = await getDoc(docRef);
  
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() } as SubscriptionTier;
}

// ============================================================================
// COURSE CATEGORIES
// ============================================================================

export async function getCourseCategories(): Promise<CourseCategory[]> {
  if (!db) return [];
  
  const q = query(
    collection(db, "courseCategories"),
    orderBy("sortOrder", "asc")
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as CourseCategory[];
}

// ============================================================================
// COURSES
// ============================================================================

export async function getCourses(options?: {
  categoryId?: string;
  featured?: boolean;
  limit?: number;
}): Promise<Course[]> {
  if (!db) return [];
  
  const constraints: QueryConstraint[] = [
    where("isPublished", "==", true),
  ];
  
  if (options?.categoryId) {
    constraints.push(where("categoryId", "==", options.categoryId));
  }
  
  if (options?.featured) {
    constraints.push(where("isFeatured", "==", true));
  }
  
  constraints.push(orderBy("createdAt", "desc"));
  
  if (options?.limit) {
    constraints.push(limit(options.limit));
  }
  
  const q = query(collection(db, "courses"), ...constraints);
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Course[];
}

export async function getCourse(courseId: string): Promise<Course | null> {
  if (!db) return null;
  
  const docRef = doc(db, "courses", courseId);
  const snapshot = await getDoc(docRef);
  
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() } as Course;
}

export async function getCourseBySlug(slug: string): Promise<Course | null> {
  if (!db) return null;
  
  const q = query(
    collection(db, "courses"),
    where("slug", "==", slug),
    limit(1)
  );
  
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() } as Course;
}

// ============================================================================
// WORKSHOPS
// ============================================================================

export async function getWorkshops(options?: {
  type?: "live" | "recorded" | "hybrid";
  upcoming?: boolean;
  limit?: number;
}): Promise<Workshop[]> {
  if (!db) return [];
  
  const constraints: QueryConstraint[] = [
    where("isPublished", "==", true),
  ];
  
  if (options?.type) {
    constraints.push(where("workshopType", "==", options.type));
  }
  
  if (options?.upcoming) {
    constraints.push(where("scheduledStart", ">=", Timestamp.now()));
  }
  
  constraints.push(orderBy("scheduledStart", "asc"));
  
  if (options?.limit) {
    constraints.push(limit(options.limit));
  }
  
  const q = query(collection(db, "workshops"), ...constraints);
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Workshop[];
}

export async function getWorkshop(workshopId: string): Promise<Workshop | null> {
  if (!db) return null;
  
  const docRef = doc(db, "workshops", workshopId);
  const snapshot = await getDoc(docRef);
  
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() } as Workshop;
}

// ============================================================================
// COURSE ENROLLMENTS
// ============================================================================

export async function enrollInCourse(userId: string, courseId: string): Promise<string> {
  if (!db) throw new Error("Firebase not initialized");
  
  const enrollmentId = `${userId}_${courseId}`;
  const docRef = doc(db, "courseEnrollments", enrollmentId);
  
  await setDoc(docRef, {
    userId,
    courseId,
    enrolledAt: Timestamp.now(),
    progressPercentage: 0,
    lastAccessedAt: Timestamp.now(),
  });
  
  return enrollmentId;
}

export async function getUserEnrollments(userId: string): Promise<CourseEnrollment[]> {
  if (!db) return [];
  
  const q = query(
    collection(db, "courseEnrollments"),
    where("userId", "==", userId),
    orderBy("enrolledAt", "desc")
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as CourseEnrollment[];
}

export async function updateEnrollmentProgress(
  enrollmentId: string,
  progressPercentage: number
): Promise<void> {
  if (!db) throw new Error("Firebase not initialized");
  
  const docRef = doc(db, "courseEnrollments", enrollmentId);
  await updateDoc(docRef, {
    progressPercentage,
    lastAccessedAt: Timestamp.now(),
    ...(progressPercentage >= 100 ? { completedAt: Timestamp.now() } : {}),
  });
}

// ============================================================================
// WORKSHOP REGISTRATIONS
// ============================================================================

export async function registerForWorkshop(userId: string, workshopId: string): Promise<string> {
  if (!db) throw new Error("Firebase not initialized");
  
  const registrationId = `${userId}_${workshopId}`;
  const docRef = doc(db, "workshopRegistrations", registrationId);
  
  await setDoc(docRef, {
    userId,
    workshopId,
    registeredAt: Timestamp.now(),
    attended: false,
    reminderSent: false,
  });
  
  return registrationId;
}

export async function getUserWorkshopRegistrations(userId: string): Promise<WorkshopRegistration[]> {
  if (!db) return [];
  
  const q = query(
    collection(db, "workshopRegistrations"),
    where("userId", "==", userId),
    orderBy("registeredAt", "desc")
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as WorkshopRegistration[];
}

// ============================================================================
// QUIZ LEADS & RESULTS
// ============================================================================

export async function saveQuizLead(lead: Omit<QuizLead, "id" | "createdAt">): Promise<string> {
  if (!db) throw new Error("Firebase not initialized");
  
  const docRef = doc(collection(db, "quizLeads"));
  await setDoc(docRef, {
    ...lead,
    createdAt: Timestamp.now(),
  });
  
  return docRef.id;
}

export async function saveQuizResult(result: Omit<QuizResult, "id" | "createdAt">): Promise<string> {
  if (!db) throw new Error("Firebase not initialized");
  
  const docRef = doc(collection(db, "quizResults"));
  await setDoc(docRef, {
    ...result,
    createdAt: Timestamp.now(),
  });
  
  return docRef.id;
}

export async function getQuizResult(resultId: string): Promise<QuizResult | null> {
  if (!db) return null;
  
  const docRef = doc(db, "quizResults", resultId);
  const snapshot = await getDoc(docRef);
  
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() } as QuizResult;
}

// ============================================================================
// BLOG POSTS
// ============================================================================

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featuredImage?: string;
  categoryId: string;
  authorName: string;
  authorImage?: string;
  isPublished: boolean;
  publishedAt?: Timestamp;
  tags: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export async function getBlogPosts(options?: {
  categoryId?: string;
  limit?: number;
}): Promise<BlogPost[]> {
  if (!db) return [];
  
  const constraints: QueryConstraint[] = [
    where("isPublished", "==", true),
  ];
  
  if (options?.categoryId) {
    constraints.push(where("categoryId", "==", options.categoryId));
  }
  
  constraints.push(orderBy("publishedAt", "desc"));
  
  if (options?.limit) {
    constraints.push(limit(options.limit));
  }
  
  const q = query(collection(db, "blogPosts"), ...constraints);
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as BlogPost[];
}

export async function getBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  if (!db) return null;
  
  const q = query(
    collection(db, "blogPosts"),
    where("slug", "==", slug),
    limit(1)
  );
  
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() } as BlogPost;
}
