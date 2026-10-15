/**
 * Adams Electric Academy LMS Types
 * TypeScript definitions for the Learning Management System
 */

// ============================================================================
// SUBSCRIPTION TYPES
// ============================================================================

export type SubscriptionStatus = 'active' | 'cancelled' | 'paused' | 'expired' | 'trial';
export type BillingCycle = 'monthly' | 'annual';

export interface SubscriptionTier {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  priceMonthly: number | null;
  priceAnnual: number | null;
  features: string[];
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserSubscription {
  id: string;
  userId: string;
  tierId: string;
  tier?: SubscriptionTier;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelledAt: string | null;
  stripeSubscriptionId: string | null;
  stripeCustomerId: string | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// COURSE TYPES
// ============================================================================

export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';
export type ContentType = 'video' | 'text' | 'quiz' | 'assignment' | 'download' | 'live';

export interface CourseCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  sortOrder: number;
  createdAt: string;
}

export interface Course {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  shortDescription: string | null;
  thumbnailUrl: string | null;
  previewVideoUrl: string | null;
  categoryId: string | null;
  category?: CourseCategory;
  instructorName: string;
  instructorBio: string | null;
  instructorImageUrl: string | null;
  difficultyLevel: DifficultyLevel;
  estimatedDurationMinutes: number | null;
  minSubscriptionTierId: string | null;
  minSubscriptionTier?: SubscriptionTier;
  isFeatured: boolean;
  isPublished: boolean;
  publishedAt: string | null;
  tags: string[];
  learningOutcomes: string[];
  prerequisites: string[];
  createdAt: string;
  updatedAt: string;
  // Computed fields
  enrollmentCount?: number;
  moduleCount?: number;
  lessonCount?: number;
  modules?: CourseModule[];
}

export interface CourseModule {
  id: string;
  courseId: string;
  title: string;
  description: string | null;
  sortOrder: number;
  createdAt: string;
  lessons?: Lesson[];
}

export interface Lesson {
  id: string;
  moduleId: string;
  title: string;
  slug: string;
  description: string | null;
  contentType: ContentType;
  videoUrl: string | null;
  videoDurationSeconds: number | null;
  textContent: string | null;
  downloadUrl: string | null;
  isPreview: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  // User-specific
  progress?: LessonProgress;
}

export interface CourseEnrollment {
  id: string;
  userId: string;
  courseId: string;
  course?: Course;
  enrolledAt: string;
  completedAt: string | null;
  progressPercentage: number;
  lastAccessedAt: string | null;
  certificateIssuedAt: string | null;
  certificateUrl: string | null;
}

export interface LessonProgress {
  id: string;
  userId: string;
  lessonId: string;
  startedAt: string;
  completedAt: string | null;
  progressSeconds: number;
  isCompleted: boolean;
  notes: string | null;
}

// ============================================================================
// ASSESSMENT TYPES
// ============================================================================

export type AssessmentType = 'pre' | 'post' | 'quiz' | 'certification' | 'diagnostic';
export type QuestionType = 'multiple_choice' | 'true_false' | 'short_answer' | 'rating_scale' | 'open_ended';

export interface Assessment {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  assessmentType: AssessmentType;
  courseId: string | null;
  lessonId: string | null;
  passingScorePercentage: number;
  timeLimitMinutes: number | null;
  maxAttempts: number;
  shuffleQuestions: boolean;
  showCorrectAnswers: boolean;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  questions?: AssessmentQuestion[];
}

export interface AssessmentQuestion {
  id: string;
  assessmentId: string;
  questionText: string;
  questionType: QuestionType;
  options: QuestionOption[];
  correctAnswer: string | string[] | null;
  explanation: string | null;
  points: number;
  sortOrder: number;
  createdAt: string;
}

export interface QuestionOption {
  id: string;
  text: string;
  isCorrect?: boolean;
}

export interface AssessmentAttempt {
  id: string;
  userId: string;
  assessmentId: string;
  assessment?: Assessment;
  startedAt: string;
  completedAt: string | null;
  scorePercentage: number | null;
  passed: boolean | null;
  answers: Record<string, string | string[]>;
  timeTakenSeconds: number | null;
  attemptNumber: number;
}

// ============================================================================
// WORKSHOP TYPES
// ============================================================================

export type WorkshopType = 'live' | 'recorded' | 'hybrid';

export interface Workshop {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  shortDescription: string | null;
  thumbnailUrl: string | null;
  workshopType: WorkshopType;
  categoryId: string | null;
  category?: CourseCategory;
  instructorName: string;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  timezone: string;
  maxParticipants: number | null;
  minSubscriptionTierId: string | null;
  meetingUrl: string | null;
  recordingUrl: string | null;
  materialsUrl: string | null;
  isFeatured: boolean;
  isPublished: boolean;
  registrationDeadline: string | null;
  createdAt: string;
  updatedAt: string;
  // Computed
  registrationCount?: number;
  isRegistered?: boolean;
}

export interface WorkshopRegistration {
  id: string;
  userId: string;
  workshopId: string;
  workshop?: Workshop;
  registeredAt: string;
  attended: boolean;
  attendanceDurationMinutes: number | null;
  feedbackRating: number | null;
  feedbackText: string | null;
  reminderSent: boolean;
}

// ============================================================================
// LEARNING PATH TYPES
// ============================================================================

export type LearningPathItemType = 'course' | 'workshop' | 'assessment';

export interface LearningPath {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  thumbnailUrl: string | null;
  estimatedDurationWeeks: number | null;
  minSubscriptionTierId: string | null;
  isFeatured: boolean;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  items?: LearningPathItem[];
}

export interface LearningPathItem {
  id: string;
  learningPathId: string;
  itemType: LearningPathItemType;
  courseId: string | null;
  workshopId: string | null;
  assessmentId: string | null;
  course?: Course;
  workshop?: Workshop;
  assessment?: Assessment;
  sortOrder: number;
  isRequired: boolean;
  createdAt: string;
}

export interface UserLearningPath {
  id: string;
  userId: string;
  learningPathId: string;
  learningPath?: LearningPath;
  startedAt: string;
  completedAt: string | null;
  progressPercentage: number;
}

// ============================================================================
// PERFORMANCE & ANALYTICS TYPES
// ============================================================================

export interface UserPerformanceMetrics {
  id: string;
  userId: string;
  metricDate: string;
  coursesCompleted: number;
  lessonsCompleted: number;
  assessmentsPassed: number;
  workshopsAttended: number;
  totalLearningMinutes: number;
  averageAssessmentScore: number | null;
  streakDays: number;
}

export interface UserDashboardStats {
  userId: string;
  enrolledCourses: number;
  completedCourses: number;
  registeredWorkshops: number;
  attendedWorkshops: number;
  certificatesEarned: number;
  totalLearningMinutes: number;
}

// ============================================================================
// CERTIFICATE TYPES
// ============================================================================

export type CertificateType = 'course' | 'learning_path' | 'workshop' | 'assessment';

export interface Certificate {
  id: string;
  userId: string;
  certificateType: CertificateType;
  courseId: string | null;
  learningPathId: string | null;
  workshopId: string | null;
  assessmentId: string | null;
  title: string;
  issuedAt: string;
  certificateNumber: string;
  pdfUrl: string | null;
  verificationUrl: string | null;
}

// ============================================================================
// DISCUSSION TYPES
// ============================================================================

export interface DiscussionThread {
  id: string;
  courseId: string | null;
  lessonId: string | null;
  userId: string;
  title: string;
  content: string;
  isPinned: boolean;
  isLocked: boolean;
  replyCount: number;
  createdAt: string;
  updatedAt: string;
  replies?: DiscussionReply[];
}

export interface DiscussionReply {
  id: string;
  threadId: string;
  userId: string;
  content: string;
  isInstructorReply: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getDifficultyLabel(level: DifficultyLevel): string {
  const labels: Record<DifficultyLevel, string> = {
    beginner: 'Beginner',
    intermediate: 'Intermediate',
    advanced: 'Advanced',
  };
  return labels[level];
}

export function getDifficultyColor(level: DifficultyLevel): string {
  const colors: Record<DifficultyLevel, string> = {
    beginner: 'text-green-600 bg-green-100',
    intermediate: 'text-blue-600 bg-blue-100',
    advanced: 'text-red-600 bg-red-100',
  };
  return colors[level];
}

export function getContentTypeIcon(type: ContentType): string {
  const icons: Record<ContentType, string> = {
    video: 'Play',
    text: 'FileText',
    quiz: 'HelpCircle',
    assignment: 'ClipboardList',
    download: 'Download',
    live: 'Radio',
  };
  return icons[type];
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${remainingMinutes}m`;
}

export function getSubscriptionTierBadgeColor(slug: string): string {
  const colors: Record<string, string> = {
    'adams-starter': 'bg-slate-100 text-slate-700',
    'adams-builder': 'bg-blue-100 text-blue-700',
    'adams-master': 'bg-purple-100 text-purple-700',
  };
  return colors[slug] || 'bg-gray-100 text-gray-700';
}
