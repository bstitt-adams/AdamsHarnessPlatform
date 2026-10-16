/**
 * Firestore Database Schema for Adams Electric Platform
 *
 * This file defines the database collections, document structures,
 * and helper types for Firestore integration.
 */

import {
  collection,
  doc,
  CollectionReference,
  DocumentReference,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import type {
  User,
  Organization,
  Opportunity,
  Project,
  Meeting,
  ActionItem,
  Rock,
  Document as AppDocument,
  Service,
  Certification,
  Capability,
  Activity,
  Note,
  Milestone,
  RockMilestone,
} from "@/types";

// ============================================================================
// Firestore Document Types (with Timestamp instead of Date)
// ============================================================================

/** Base document fields for all collections */
interface BaseDocument {
  id: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

/** User document in Firestore */
export interface UserDoc extends Omit<User, "createdAt" | "lastActive" | "capabilities"> {
  createdAt: Timestamp;
  lastActive: Timestamp;
  capabilities?: string[]; // Reference IDs to capabilities subcollection
}

/** Organization document in Firestore */
export interface OrganizationDoc extends Omit<Organization, "createdAt" | "contacts" | "capabilities" | "certifications"> {
  createdAt: Timestamp;
  updatedAt: Timestamp;
  contactIds?: string[]; // Reference IDs to users
  capabilityIds?: string[]; // Reference IDs
  certificationIds?: string[]; // Reference IDs
}

/** Opportunity document in Firestore */
export interface OpportunityDoc extends Omit<Opportunity, "createdAt" | "updatedAt" | "expectedCloseDate" | "owner" | "assignedAffiliates" | "organization" | "services" | "notes" | "activities"> {
  createdAt: Timestamp;
  updatedAt: Timestamp;
  expectedCloseDate: Timestamp;
  ownerId: string; // Reference to user
  assignedAffiliateIds?: string[]; // Reference IDs to users
  serviceIds: string[]; // Reference IDs to services
}

/** Project document in Firestore */
export interface ProjectDoc extends Omit<Project, "createdAt" | "startDate" | "endDate" | "team" | "organization" | "milestones" | "documents" | "meetings"> {
  createdAt: Timestamp;
  updatedAt: Timestamp;
  startDate: Timestamp;
  endDate?: Timestamp;
  teamIds: string[]; // Reference IDs to users
}

/** Meeting document in Firestore */
export interface MeetingDoc extends Omit<Meeting, "date" | "attendees" | "actionItems"> {
  date: Timestamp;
  attendeeIds: string[]; // Reference IDs to users
}

/** Action Item document in Firestore */
export interface ActionItemDoc extends Omit<ActionItem, "createdAt" | "dueDate" | "assignee"> {
  createdAt: Timestamp;
  updatedAt: Timestamp;
  dueDate?: Timestamp;
  assigneeId: string; // Reference to user
}

/** Rock (90-day goal) document in Firestore */
export interface RockDoc extends Omit<Rock, "createdAt" | "owner" | "milestones"> {
  createdAt: Timestamp;
  updatedAt: Timestamp;
  ownerId: string; // Reference to user
}

// ============================================================================
// Traction/EOS System Types
// ============================================================================

/** Traction Scorecard Metric document in Firestore */
export interface TractionScorecardMetricDoc {
  id: string;
  name: string;
  goal: number;
  actual: number;
  ownerId: string; // Reference to team member
  ownerName: string; // Denormalized for display
  trend: "up" | "down" | "flat";
  unit?: string; // $, %, #, etc.
  weekNumber?: number;
  year?: number;
  // Linkages to other EOS components
  linkedRockIds?: string[]; // Rocks that affect this metric
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** Traction Issue document in Firestore (IDS: Identify, Discuss, Solve) */
export interface TractionIssueDoc {
  id: string;
  title: string; // Short title for the issue
  description: string;
  priority: "high" | "medium" | "low";
  identifiedDate: Timestamp;
  ownerId: string; // Reference to team member
  ownerName: string; // Denormalized for display
  status: "open" | "in-progress" | "solved";
  solvedDate?: Timestamp;
  // Linkages to other EOS components
  linkedRockId?: string; // Rock this issue is blocking or related to
  linkedTodoIds?: string[]; // Todos created to solve this issue
  meetingId?: string; // Meeting where this issue was identified
  notes?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** Traction To-Do document in Firestore */
export interface TractionTodoDoc {
  id: string;
  title: string; // Short title for the todo
  description: string;
  ownerId: string; // Reference to team member
  ownerName: string; // Denormalized for display
  dueDate: Timestamp;
  status: "not-started" | "in-progress" | "complete";
  completedDate?: Timestamp;
  // Linkages to other EOS components
  linkedRockId?: string; // Rock this todo supports
  linkedIssueId?: string; // Issue this todo helps solve
  meetingId?: string; // Reference to meeting where created
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** Traction Level 10 Meeting document in Firestore */
export interface TractionMeetingDoc {
  id: string;
  title?: string; // Optional meeting title
  date: Timestamp;
  startTime: string;
  endTime: string;
  attendeeIds: string[]; // References to team members
  attendeeNames: string[]; // Denormalized for display
  rating: number; // 1-10
  issuesSolved: number;
  rocksReviewed: boolean;
  scorecardReviewed: boolean;
  todoCompletionRate: number; // 0-100
  // Linkages to other EOS components
  reviewedRockIds?: string[]; // Rocks reviewed in this meeting
  solvedIssueIds?: string[]; // Issues solved in this meeting
  createdTodoIds?: string[]; // Todos created in this meeting
  notes?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** Traction Team Member document (extends base TeamMemberDoc) */
export interface TractionTeamMemberDoc {
  id: string;
  name: string;
  role: string;
  category: "team" | "contractor" | "advisor" | "other";
  getsIt: boolean | null;
  wantsIt: boolean | null;
  capacityToDoIt: boolean | null;
  rightSeat: boolean | null;
  email?: string;
  phone?: string;
  avatar?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** Traction Rock document (quarterly priorities) */
export interface TractionRockDoc {
  id: string;
  title: string; // Short title for the rock
  description: string; // Detailed description
  ownerId: string; // Reference to team member
  ownerName: string; // Denormalized for display
  dueDate: Timestamp;
  status: "on-track" | "at-risk" | "off-track" | "complete";
  progress: number; // 0-100
  quarter: string; // e.g., "Q1 2025"
  // Milestones for tracking progress
  milestones?: Array<{
    id: string;
    title: string;
    completed: boolean;
    completedAt?: Timestamp;
  }>;
  // Linkages to other EOS components
  linkedIssueIds?: string[]; // Issues related to this rock
  linkedTodoIds?: string[]; // Todos created from this rock
  linkedMetricIds?: string[]; // Metrics this rock affects
  notes?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** Document/File document in Firestore */
export interface DocumentDoc extends Omit<AppDocument, "createdAt" | "uploadedBy"> {
  createdAt: Timestamp;
  uploadedById: string; // Reference to user
  storagePath: string; // Firebase Storage path
}

/** Enhanced Platform Document for document management system */
export interface PlatformDocumentDoc {
  id: string;
  name: string;
  description?: string;

  // File info
  fileType: "pdf" | "docx" | "xlsx" | "pptx" | "image" | "archive" | "other";
  mimeType: string;
  fileSize: number; // bytes
  storagePath: string; // Firebase Storage path
  downloadUrl?: string;

  // Folder/Category
  folder: "proposals" | "templates" | "reports" | "agreements" | "projects" | "marketing" | "internal" | "other";
  tags?: string[];

  // Source tracking
  source: "upload" | "proposal-creator" | "growth-iq-quiz" | "ai-generated" | "docuseal" | "other";
  sourceId?: string; // ID of the source (e.g., proposal ID, quiz submission ID)

  // Versioning
  version: number;
  parentDocumentId?: string; // For version tracking - points to original document
  isLatestVersion: boolean;
  versionNotes?: string;

  // Metadata
  metadata: {
    // For proposals
    proposalId?: string;
    proposalTitle?: string;
    clientName?: string;

    // For templates
    templateCategory?: string;
    isTemplate?: boolean;

    // For GROWTH IQ reports
    quizSubmissionId?: string;
    reportRecipientName?: string;
    reportRecipientEmail?: string;
    reportRecipientCompany?: string;
    quizScore?: number;

    // For agreements
    agreementType?: string;
    signedDate?: Timestamp;
    signedBy?: string[];
    expirationDate?: Timestamp;

    // For project links
    linkedProjectIds?: string[];
    linkedOrganizationId?: string;

    // Custom metadata
    custom?: Record<string, unknown>;
  };

  // Access control
  visibility: "private" | "team" | "organization" | "public";
  sharedWith?: string[]; // User IDs

  // Audit
  uploadedById: string;
  uploadedByName: string;
  lastModifiedById?: string;
  lastModifiedByName?: string;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** Document Version History entry */
export interface DocumentVersionDoc {
  id: string;
  documentId: string; // Parent document ID
  version: number;
  storagePath: string;
  downloadUrl?: string;
  fileSize: number;
  versionNotes?: string;
  createdById: string;
  createdByName: string;
  createdAt: Timestamp;
}

/** AI Document Edit Request */
export interface DocumentAiEditDoc {
  id: string;
  documentId: string;
  requestType: "create" | "edit" | "summarize" | "translate" | "format";
  prompt: string;
  status: "pending" | "processing" | "completed" | "failed";
  resultDocumentId?: string; // New document created from AI edit
  errorMessage?: string;
  requestedById: string;
  requestedByName: string;
  createdAt: Timestamp;
  completedAt?: Timestamp;
}

/** Service document in Firestore */
export interface ServiceDoc extends Service {
  createdAt: Timestamp;
  updatedAt: Timestamp;
  isActive: boolean;
}

/** Certification document in Firestore */
export interface CertificationDoc extends Omit<Certification, "dateObtained" | "expirationDate"> {
  dateObtained: Timestamp;
  expirationDate?: Timestamp;
  organizationId: string; // Parent organization
}

/** Activity document in Firestore */
export interface ActivityDoc extends Omit<Activity, "createdAt" | "user"> {
  createdAt: Timestamp;
  userId: string; // Reference to user
  entityType: "opportunity" | "project" | "organization" | "meeting" | "document" | "task" | "rock" | "affiliate" | "team-member" | "proposal" | "calendar" | "settings";
  entityId: string;
  entityName?: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Affiliate Networking System Types
// ============================================================================

/** Affiliate Biography/Profile document */
export interface AffiliateBiographyDoc {
  id: string;
  affiliateId: string; // Reference to user

  // Business Information
  businessName: string;
  profession: string;
  location: string;
  yearsInBusiness: number;
  previousJobs: string[];

  // Personal Information
  spouse?: string;
  children?: string;
  pets?: string;
  hobbies: string[];
  activitiesOfInterest: string[];
  cityOfResidence: string;
  yearsInCity?: number;

  // Miscellaneous
  burningDesire?: string;
  uniqueFact?: string;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** GAINS Profile document (Goals, Accomplishments, Interests, Networks, Skills) */
export interface GainsProfileDoc {
  id: string;
  affiliateId: string; // Reference to user

  goals: string; // Financial, business, educational, personal objectives
  accomplishments: string; // Achievements, completed projects
  interests: string; // Things they enjoy doing, talking about, collecting
  networks: string; // Organizations, institutions, associations they belong to
  skills: string; // Talents, abilities, assets

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** Contact Sphere document */
export interface ContactSphereDoc {
  id: string;
  affiliateId: string; // Reference to user

  sphereName: string; // Name of their contact sphere

  // Top 10 members in their contact sphere
  members: {
    name: string;
    profession?: string;
    company?: string;
  }[];

  // Top 3 professions they need to round out their sphere
  topProfessionsNeeded: {
    profession: string;
    description?: string;
  }[];

  commitment?: string; // Their commitment to help fill partner's sphere

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** Previous Customers document */
export interface PreviousCustomersDoc {
  id: string;
  affiliateId: string; // Reference to user

  customers: {
    name: string;
    industry: string;
    description: string; // What was done for them
    isIdealClient: boolean;
  }[];

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** One-to-One Meeting document */
export interface OneToOneMeetingDoc {
  id: string;

  // Participants
  initiatorId: string; // Affiliate who scheduled the meeting
  partnerId: string; // Affiliate they're meeting with

  // Scheduling
  scheduledDate: Timestamp;
  scheduledTime: string; // e.g., "10:00 AM"
  duration: number; // Minutes (typically 60)

  // Location
  meetingType: "virtual" | "in-person";
  location?: string; // Restaurant, office address, or video link
  virtualPlatform?: "zoom" | "teams" | "google-meet" | "other";

  // Status
  status: "scheduled" | "confirmed" | "completed" | "cancelled" | "no-show";

  // Pre-meeting
  agendaItems?: string[];
  worksheetsShared: boolean;

  // Post-meeting outcomes
  meetingNotes?: string;
  shortTermReferralCommitment?: string;
  longTermReferralCommitment?: string;
  adamsReferralDiscussed: boolean;
  adamsReferralDetails?: string;

  // Follow-up
  followUpDate?: Timestamp;
  followUpCompleted: boolean;
  followUpNotes?: string;

  // Next meeting
  nextMeetingScheduled: boolean;
  nextMeetingDate?: Timestamp;

  // AI matching data
  matchScore?: number; // 0-100 compatibility score
  matchReasons?: string[]; // Why AI suggested this pairing

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** Referral document */
export interface ReferralDoc {
  id: string;

  // Who gave and received the referral
  referrerId: string; // Affiliate who gave the referral
  referrerName: string; // Cached name for display
  recipientId: string; // Affiliate who received the referral (or Adams)
  recipientName: string; // Cached name for display

  // Source meeting (if from a one-to-one)
  oneToOneMeetingId?: string;

  // Referral details
  referralType: "short-term" | "long-term";
  prospectName: string;
  prospectCompany?: string;
  prospectEmail?: string;
  prospectPhone?: string;
  prospectTitle?: string;

  // Why this is a good referral
  description: string;
  whyGoodFit?: string;

  // Is this for Adams?
  isAdamsReferral: boolean;
  adamsServiceInterest?: string[]; // Which Adams services they might need

  // Pipeline/Deal status
  status: "submitted" | "contacted" | "meeting-scheduled" | "proposal" | "negotiation" | "won" | "lost";

  // Commission tracking
  commissionTier: "referral" | "assist" | "co-sell"; // 7%, 12%, 17%
  estimatedValue?: number; // Estimated deal value

  // Outcome tracking
  dealValue?: number; // In dollars, when won
  dealClosedDate?: Timestamp;
  lostReason?: string;
  commissionPaid?: number;
  commissionPaidDate?: Timestamp;

  // Activity log
  lastContactDate?: Timestamp;
  lastActivityNote?: string;
  contactAttempts: number;

  // Linked entities
  linkedProjectId?: string;
  linkedOrganizationId?: string;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** Affiliate Stats document (aggregated metrics) */
export interface AffiliateStatsDoc {
  id: string;
  affiliateId: string; // Reference to user

  // Profile completion
  biographyComplete: boolean;
  gainsProfileComplete: boolean;
  contactSphereComplete: boolean;
  customersListComplete: boolean;
  profileCompletionPercent: number;

  // One-to-one activity
  totalOneToOnesScheduled: number;
  totalOneToOnesCompleted: number;
  oneToOnesThisMonth: number;
  oneToOnesThisQuarter: number;
  lastOneToOneDate?: Timestamp;

  // Referral activity
  referralsGiven: number;
  referralsReceived: number;
  referralsGivenThisMonth: number;
  referralsReceivedThisMonth: number;

  // Deal outcomes
  dealsClosedFromReferralsGiven: number;
  dealsClosedFromReferralsReceived: number;
  totalRevenueGenerated: number; // From referrals they gave that closed
  totalRevenueReceived: number; // From referrals they received that closed

  // ADAMS-specific
  adamsReferralsGiven: number;
  adamsReferralsClosed: number;
  adamsRevenueGenerated: number;

  // Engagement score (calculated)
  engagementScore: number; // 0-100

  // Streaks
  currentOneToOneStreak: number; // Consecutive weeks with a one-to-one
  longestOneToOneStreak: number;

  updatedAt: Timestamp;
}

/** AI Match Suggestion document */
export interface AiMatchSuggestionDoc {
  id: string;
  affiliateId: string; // Who this suggestion is for
  suggestedPartnerId: string; // Suggested partner

  matchScore: number; // 0-100

  // Reasons for the match
  reasons: {
    category: "contact-sphere" | "interests" | "skills" | "geography" | "complementary" | "rotation";
    description: string;
    weight: number;
  }[];

  // Suggested talking points
  talkingPoints: string[];

  // Has this suggestion been acted on?
  status: "pending" | "accepted" | "declined" | "expired";

  // When was their last meeting?
  lastMeetingDate?: Timestamp;
  daysSinceLastMeeting?: number;

  createdAt: Timestamp;
  expiresAt: Timestamp; // Suggestions expire after a period
}

// ============================================================================
// Bug Tracker Types
// ============================================================================

/** Bug Tracker item type */
export type BugTrackerItemType = "bug" | "idea" | "improvement";

/** Bug Tracker item status */
export type BugTrackerItemStatus = "open" | "in_progress" | "resolved" | "closed" | "wont_fix";

/** Bug Tracker item priority */
export type BugTrackerItemPriority = "low" | "medium" | "high" | "critical";

/** Bug Tracker Comment */
export interface BugTrackerComment {
  id: string;
  author: string;
  authorId: string;
  content: string;
  createdAt: Timestamp;
}

/** Bug Tracker Item document in Firestore */
export interface BugTrackerItemDoc {
  id: string;
  type: BugTrackerItemType;
  title: string;
  description: string;
  status: BugTrackerItemStatus;
  priority: BugTrackerItemPriority;
  page?: string;
  reporterId: string;
  reporterName: string;
  assigneeId?: string;
  assigneeName?: string;
  tags: string[];
  comments: BugTrackerComment[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============================================================================
// AI Workforce Types
// ============================================================================

/** AI Employee role types */
export type AIEmployeeRoleType = "cfo" | "hr" | "legal" | "marketing" | "sales" | "custom";

/** AI Employee document in Firestore */
export interface AIEmployeeDoc {
  id: string;
  userId: string; // Owner of this AI employee
  role: AIEmployeeRoleType;
  name: string;
  title: string;
  description: string;
  avatar: string;
  color: string;
  systemPrompt: string;
  capabilities: string[];
  sampleQuestions: string[];
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** AI Employee Chat Message */
export interface AIEmployeeChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Timestamp;
}

/** AI Employee Chat document in Firestore */
export interface AIEmployeeChatDoc {
  id: string;
  employeeId: string;
  userId: string;
  messages: AIEmployeeChatMessage[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** Note document in Firestore */
export interface NoteDoc extends Omit<Note, "createdAt" | "updatedAt" | "author"> {
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  authorId: string; // Reference to user
  entityType: "opportunity" | "project" | "meeting";
  entityId: string;
}

/** Milestone document in Firestore */
export interface MilestoneDoc extends Omit<Milestone, "dueDate" | "completedDate"> {
  dueDate: Timestamp;
  completedDate?: Timestamp;
}

/** Rock Milestone document in Firestore */
export interface RockMilestoneDoc extends Omit<RockMilestone, "completedDate"> {
  completedDate?: Timestamp;
  rockId: string;
}

// ============================================================================
// Strategic Partners
// ============================================================================

/** Zoom Recording entry for Strategic Partners */
export interface ZoomRecording {
  title: string;
  url: string;
  date?: string;
}

/** Strategic Partner document in Firestore */
export interface StrategicPartnerDoc {
  id: string;
  firstName: string;
  lastName: string;
  company: string;
  website: string;
  expertise: string;
  email?: string;
  phone?: string;
  linkedIn?: string;
  logo?: string;
  notes?: string;
  zoomRecordings?: ZoomRecording[];
  status: "active" | "inactive" | "pending";
  // Additional flags - Partners/Suppliers can also be Clients
  isClient?: boolean; // Can this partner also be served as a client?
  clientSince?: Timestamp; // When they became a client
  clientNotes?: string; // Notes about them as a client
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** Team Member document in Firestore */
export interface TeamMemberDoc {
  id: string;
  firebaseUid?: string; // Links to Firebase Auth user UID
  authUid?: string; // Legacy link to Firebase Auth user UID
  firstName: string;
  lastName: string;
  emailPrimary: string;
  emailSecondary?: string;
  mobile?: string;
  expertise: string;
  title?: string;
  company?: string;
  location?: string;
  bio?: string;
  avatar?: string;
  linkedIn?: string;
  website?: string;
  role: "superadmin" | "admin" | "team" | "affiliate" | "consultant" | "client";
  status: "active" | "inactive" | "pending";
  // Leadership role flags for About/Leadership pages
  isCEO?: boolean;
  isCOO?: boolean;
  isCTO?: boolean;
  isCRO?: boolean;
  // Additional flags - Affiliates/Suppliers can also be Clients
  isClient?: boolean; // Can this affiliate/team member also be served as a client?
  clientSince?: Timestamp; // When they became a client
  clientNotes?: string; // Notes about them as a client
  // Mattermost integration
  mattermostUserId?: string; // Links to Mattermost user ID for playbook assignments
  departmentIds?: string[]; // Reference IDs to departments
  supervisorId?: string; // Reference ID to supervising team member
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** Platform Development Task document in Firestore */
export interface PlatformDevTaskDoc {
  id: string;
  title: string;
  description: string;
  category: "Firebase" | "Vercel" | "Portal UI" | "LMS" | "Safety Calendar" | "Hermes" | "Integrations" | "Other";
  systemsAffected: string[];
  aiCapability?: string;
  status: "planned" | "in-progress" | "completed" | "blocked";
  hoursSpent: number;
  taskDate: Timestamp;
  createdByUid: string;
  createdByName: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** Platform Development Weekly Report document in Firestore */
export interface PlatformDevReportDoc {
  id: string;
  reportDate: Timestamp;
  periodStart: Timestamp;
  periodEnd: Timestamp;
  tasks: string[]; // Task IDs included
  summaryText: string;
  newCapabilitiesText: string;
  recipientEmail: string;
  pdfBase64: string;
  pdfFileName: string;
  generatedByUid: string;
  generatedByName: string;
  sentAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** Event Ticket Type */
export interface EventTicketType {
  id: string;
  name: string;
  description?: string;
  price: number; // in cents
  quantity: number;
  quantitySold: number;
  maxPerOrder: number;
  salesStartDate?: Timestamp;
  salesEndDate?: Timestamp;
  isActive: boolean;
  sortOrder: number;
}

/** Event Registration/Order */
export interface EventRegistration {
  id: string;
  eventId: string;
  userId?: string;
  // Attendee Info
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  // Tickets
  tickets: {
    ticketTypeId: string;
    ticketTypeName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }[];
  // Payment
  subtotal: number;
  discount: number;
  total: number;
  stripePaymentIntentId?: string;
  stripeSessionId?: string;
  paymentStatus: "pending" | "paid" | "failed" | "refunded";
  // Status
  status: "pending" | "confirmed" | "cancelled" | "checked_in";
  checkInTime?: Timestamp;
  // Metadata
  promoCode?: string;
  notes?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** Event Landing Page Design */
export interface EventLandingPageDesign {
  heroImage?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  sections: {
    id: string;
    type: "description" | "schedule" | "speakers" | "tickets" | "faq" | "sponsors" | "gallery" | "map";
    title?: string;
    content?: string;
    isVisible: boolean;
    order: number;
  }[];
  theme?: {
    primaryColor?: string;
    secondaryColor?: string;
    backgroundColor?: string;
  };
  customCss?: string;
}

/** Event document in Firestore */
export interface EventDoc {
  id: string;
  title: string;
  description?: string;
  shortDescription?: string;
  // Date/Time
  startDate: Timestamp;
  endDate?: Timestamp;
  timezone?: string;
  isAllDay?: boolean;
  // Location
  locationType: "virtual" | "in-person" | "hybrid";
  location?: string;
  virtualLink?: string;
  // Registration (legacy - for external registration)
  registrationUrl?: string;
  registrationDeadline?: Timestamp;
  maxAttendees?: number;
  currentAttendees?: number;
  // Ticketing
  ticketTypes?: EventTicketType[];
  isFreeEvent?: boolean;
  requiresPayment?: boolean;
  // Landing Page
  slug?: string; // URL-friendly identifier
  landingPageDesign?: EventLandingPageDesign;
  hasCustomLandingPage?: boolean;
  // Speakers/Presenters
  speakers?: {
    id: string;
    name: string;
    title?: string;
    company?: string;
    bio?: string;
    imageUrl?: string;
    socialLinks?: Record<string, string>;
  }[];
  // Schedule/Agenda
  agenda?: {
    id: string;
    time: string;
    title: string;
    description?: string;
    speakerId?: string;
  }[];
  // Sponsors
  sponsors?: {
    id: string;
    name: string;
    logoUrl?: string;
    websiteUrl?: string;
    tier?: "platinum" | "gold" | "silver" | "bronze";
  }[];
  // FAQ
  faq?: {
    id: string;
    question: string;
    answer: string;
  }[];
  // Display
  imageUrl?: string;
  category?: "webinar" | "workshop" | "conference" | "networking" | "training" | "other";
  tags?: string[];
  // Status
  status: "draft" | "published" | "cancelled" | "completed";
  isFeatured?: boolean;
  // Stripe Integration
  stripeProductId?: string;
  stripePriceIds?: Record<string, string>; // ticketTypeId -> stripePriceId
  // Metadata
  createdBy?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** Platform Settings document in Firestore */
export interface PlatformSettingsDoc {
  id: string;
  // Social Links Configuration
  socialLinks?: {
    linkedin?: { url: string; visible: boolean };
    twitter?: { url: string; visible: boolean };
    youtube?: { url: string; visible: boolean };
    facebook?: { url: string; visible: boolean };
    instagram?: { url: string; visible: boolean };
  };
  // API Integrations
  integrations: {
    mattermost?: {
      apiKey?: string;
      webhookUrl?: string;
      serverUrl?: string;
      teamId?: string;
      status: "connected" | "disconnected" | "error";
      lastTested?: Timestamp;
    };
    apollo?: {
      apiKey?: string;
      accountId?: string;
      status: "connected" | "disconnected" | "error";
      lastTested?: Timestamp;
    };
    gohighlevel?: {
      apiKey?: string;
      locationId?: string;
      agencyId?: string;
      status: "connected" | "disconnected" | "error";
      lastTested?: Timestamp;
    };
    zoom?: {
      apiKey?: string;
      apiSecret?: string;
      accountId?: string;
      status: "connected" | "disconnected" | "error";
      lastTested?: Timestamp;
    };
    docuseal?: {
      apiKey?: string;
      webhookSecret?: string;
      status: "connected" | "disconnected" | "error";
      lastTested?: Timestamp;
    };
    stripe?: {
      secretKey?: string;
      publishableKey?: string;
      webhookSecret?: string;
      status: "connected" | "disconnected" | "error";
      lastTested?: Timestamp;
    };
  };
  // LLM Configuration
  llmConfig?: {
    provider: string;
    model: string;
    apiKey?: string;
    ollamaUrl?: string;
    useOllama: boolean;
    baseUrl?: string;
    useOpenAICompatible?: boolean;
  };
  // Hermes AI Runtime
  hermes?: {
    /** Which endpoint Hermes calls at runtime */
    mode?: "local" | "remote" | "env";
    localUrl?: string;
    remoteUrl?: string;
    apiKey?: string;
    model?: string;
    status?: "connected" | "disconnected" | "error";
    lastTested?: Timestamp;
  };
  // Telegram bot configuration managed by the Admin portal
  telegram?: {
    enabled?: boolean;
    botToken?: string;
    webhookSecret?: string;
    webhookUrl?: string;
    botUsername?: string;
    status?: "connected" | "disconnected" | "error";
    lastTested?: Timestamp;
  };
  // Microsoft Teams bot configuration managed by the Admin portal
  teams?: {
    enabled?: boolean;
    appId?: string;
    tenantId?: string;
    webhookSecret?: string;
    webhookUrl?: string;
    status?: "connected" | "disconnected" | "error";
    lastTested?: Timestamp;
  };
  // Webhook Events
  webhookEvents?: Record<string, boolean>;
  // Notification Settings
  notificationSettings?: {
    syncWithMattermost: boolean;
    inAppEnabled: boolean;
    browserEnabled: boolean;
    soundEnabled: boolean;
  };
  // SuperAdmin Visibility Controls
  sidebarVisibility?: {
    navigation?: boolean;
    work?: boolean;
    intelligence?: boolean;
    admin?: boolean;
    initiatives?: boolean;
    commandCenter?: boolean;
    opportunities?: boolean;
    projects?: boolean;
    affiliates?: boolean;
    organizations?: boolean;
    calendar?: boolean;
    meetings?: boolean;
    rocks?: boolean;
    proposals?: boolean;
    goHighLevel?: boolean;
    askAdamsBrain?: boolean;
    teamMembers?: boolean;
    strategicPartners?: boolean;
    settings?: boolean;
    activityLog?: boolean;
  };
  l83ToolsVisibility?: {
    transcription?: boolean;
    imageGen?: boolean;
    headshot?: boolean;
    youtube?: boolean;
    tts?: boolean;
    crawler?: boolean;
    pdfOcr?: boolean;
  };
  updatedAt: Timestamp;
  updatedBy?: string;
}

// ============================================================================
// Apollo Purchased Contacts
// ============================================================================

/** Purchased contact from Apollo */
export interface ApolloPurchasedContactDoc {
  id: string;
  apolloId: string;
  firstName: string;
  lastName: string;
  name: string;
  title: string;
  company: string;
  companyId?: string;
  location?: string;
  industry?: string;
  companySize?: string;
  email?: string;
  phone?: string;
  linkedIn?: string;
  emailPurchased: boolean;
  phonePurchased: boolean;
  emailPurchasedAt?: Timestamp;
  phonePurchasedAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** Contact entry in a saved list */
export interface SavedListContact {
  apolloId: string;
  name: string;
  firstName?: string;
  lastName?: string;
  title: string;
  company: string;
  companyId?: string;
  location?: string;
  industry?: string;
  companySize?: string;
  email?: string;
  phone?: string;
  linkedIn?: string;
  addedAt: Timestamp;
}

/** Saved prospect list */
export interface ApolloSavedListDoc {
  id: string;
  name: string;
  description?: string;
  contacts: SavedListContact[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============================================================================
// ThomasNet Supplier Search Types
// ============================================================================

/** ThomasNet saved supplier document */
export interface ThomasNetSupplierDoc {
  id: string;
  thomasnetId?: string;
  companyName: string;
  description?: string;
  location?: string;
  city?: string;
  state?: string;
  country?: string;
  phone?: string;
  website?: string;
  categories?: string[];
  certifications?: string[];
  annualRevenue?: string;
  employeeCount?: string;
  yearFounded?: string;
  thomasnetUrl?: string;
  savedAt: Timestamp;
  updatedAt: Timestamp;
  notes?: string;
}

/** Supplier entry in a saved list */
export interface SavedSupplierContact {
  thomasnetId?: string;
  companyName: string;
  description?: string;
  location?: string;
  city?: string;
  state?: string;
  phone?: string;
  website?: string;
  categories?: string[];
  certifications?: string[];
  employeeCount?: string;
  thomasnetUrl?: string;
  addedAt: Timestamp;
}

/** Saved supplier list */
export interface ThomasNetSavedListDoc {
  id: string;
  name: string;
  description?: string;
  suppliers: SavedSupplierContact[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============================================================================
// GoHighLevel Integration Types
// ============================================================================

/** GoHighLevel Integration configuration */
export interface GHLIntegrationDoc {
  id: string;
  // API Configuration
  apiToken: string;
  locationId: string;
  agencyId?: string;
  // Integration Settings
  name: string;
  description?: string;
  isActive: boolean;
  // Sync Settings
  syncContacts: boolean;
  syncOpportunities: boolean;
  syncCalendars: boolean;
  syncPipelines: boolean;
  syncCampaigns: boolean;
  // Mapping Configuration
  contactMapping: Record<string, string>;
  // Pipeline Configuration
  defaultPipelineId?: string;
  defaultStageId?: string;
  // Webhook Configuration
  webhookUrl?: string;
  webhookSecret?: string;
  enableWebhooks: boolean;
  // Last Sync Information
  lastSyncAt?: Timestamp;
  lastSyncStatus: 'success' | 'error' | 'pending' | 'never';
  lastSyncError?: string;
  totalContactsSynced: number;
  totalOpportunitiesSynced: number;
  // Rate Limiting
  rateLimitRemaining?: number;
  rateLimitReset?: Timestamp;
  // Metadata
  createdBy: string;
  lastModifiedBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** GoHighLevel Sync Log */
export interface GHLSyncLogDoc {
  id: string;
  integrationId: string;
  // Sync Details
  syncType: 'contacts' | 'opportunities' | 'calendars' | 'pipelines' | 'campaigns' | 'full';
  status: 'started' | 'in_progress' | 'completed' | 'failed';
  // Statistics
  recordsProcessed: number;
  recordsSuccessful: number;
  recordsFailed: number;
  // Timing
  startedAt: Timestamp;
  completedAt?: Timestamp;
  duration?: number;
  // Errors
  errors: Array<{
    recordId?: string;
    error: string;
    details?: unknown;
  }>;
  // Summary
  summary?: {
    contactsCreated: number;
    contactsUpdated: number;
    opportunitiesCreated: number;
    opportunitiesUpdated: number;
  };
  // Metadata
  triggeredBy: string;
  triggerType: 'manual' | 'scheduled' | 'webhook' | 'event';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** GoHighLevel Workflow (AI-generated) */
export interface GHLWorkflowDoc {
  id: string;
  name: string;
  description: string;
  workflow: object;
  status: 'draft' | 'deployed' | 'archived';
  ghlWorkflowId?: string;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  deployedAt?: Timestamp;
}

/** GoHighLevel Imported Workflow */
export interface GHLImportedWorkflowDoc {
  id: string;
  ghlWorkflowId: string;
  name: string;
  description: string;
  status: string;
  originalFormat: object;
  trigger: object;
  actions: unknown[];
  plainLanguagePrompt?: string;
  importedAt: Timestamp;
  convertedAt?: Timestamp;
  locationId: string;
}

/** Calendar Event (built-in calendar) */
export interface CalendarEventDoc {
  id: string;
  title: string;
  description?: string;
  startDate: Timestamp;
  endDate: Timestamp;
  allDay?: boolean;
  type: 'meeting' | 'rock' | 'todo' | 'issue' | 'custom' | 'one-to-one';
  color?: string;
  attendees?: string[];
  location?: string;
  recurringFrequency?: 'daily' | 'weekly' | 'monthly';
  recurringUntil?: Timestamp;
  recurringParentId?: string; // ID of the parent recurring event
  // GHL sync fields
  ghlEventId?: string;
  syncedToGhl?: boolean;
  // Traction references
  rockId?: string;
  todoId?: string;
  issueId?: string;
  meetingId?: string;
  // 1-to-1 reference
  oneToOneQueueItemId?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** Site Calendar (safety office / job site display calendar) */
export interface SiteCalendarDoc {
  id: string;
  name: string;
  slug: string;
  pin: string;
  logoUrl?: string;
  primaryColor?: string;
  defaultLayout: "vertical" | "horizontal" | "agenda" | "month";
  weekStartDay?: number;
  weekEndDay?: number;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** Site Calendar Item (event/task displayed on a safety office TV) */
export interface SiteCalendarItemDoc {
  id: string;
  siteId: string;
  title: string;
  titleEs?: string;
  description?: string;
  descriptionEs?: string;
  date: Timestamp;
  time?: string;
  location?: string;
  assignee?: string;
  order: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** Microsoft Graph token storage per user */
export interface UserMicrosoftTokenDoc {
  id: string;
  userId: string;
  email: string;
  displayName?: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Timestamp;
  scopes: string[];
  status: "connected" | "disconnected" | "error";
  lastVerifiedAt?: Timestamp;
  lastError?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** Chat channel connections for a user (Telegram + Teams + Hermes) */
export interface UserChatChannelDoc {
  id: string;
  userId: string;
  teamMemberId?: string;
  displayName?: string;
  email?: string;
  role?: "superadmin" | "admin" | "team" | "affiliate" | "consultant" | "client";
  telegramUserId?: string;
  telegramChatId?: string;
  telegramUsername?: string;
  hermesEnabled?: boolean;
  isActive?: boolean;
  teamsUserId?: string;
  teamsConversationId?: string;
  teamsUserEmail?: string;
  teamsHermesEnabled?: boolean;
  teamsIsActive?: boolean;
  preferredChannel?: "telegram" | "teams" | "both";
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** 1-to-1 Scheduling Queue Item */
export interface OneToOneQueueItemDoc {
  id: string;
  // Team member to schedule with
  teamMemberId: string;
  teamMemberName: string;
  teamMemberEmail: string;
  teamMemberExpertise?: string;
  teamMemberAvatar?: string;
  // Queue status
  status: 'queued' | 'scheduled' | 'completed' | 'cancelled';
  // Scheduling details (when scheduled)
  scheduledDate?: Timestamp;
  scheduledTime?: string;
  duration?: number; // minutes
  location?: string;
  meetingType?: 'virtual' | 'in-person';
  calendarEventId?: string;
  // Notes
  notes?: string;
  // Priority/order
  priority: number;
  // Who added this to queue
  addedBy: string;
  addedByName?: string;
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
  scheduledAt?: Timestamp;
  completedAt?: Timestamp;
}

// ============================================================================
// Team Member Availability & Booking Types
// ============================================================================

/** Weekly availability slot for a team member */
export interface AvailabilitySlot {
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday, 6 = Saturday
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  isEnabled: boolean;
}

/** Team member availability settings */
export interface TeamMemberAvailabilityDoc {
  id: string; // Same as team member ID
  teamMemberId: string;
  teamMemberName: string;
  teamMemberEmail: string;
  // Booking page settings
  bookingSlug: string; // Unique URL slug for booking page
  bookingTitle?: string; // Custom title for booking page
  bookingDescription?: string; // Description shown on booking page
  timezone: string; // e.g., "America/New_York"
  // Availability slots
  weeklyAvailability: AvailabilitySlot[];
  // Meeting settings
  defaultMeetingDuration: number; // minutes
  allowedDurations: number[]; // e.g., [30, 45, 60]
  bufferBetweenMeetings: number; // minutes
  maxAdvanceBookingDays: number; // How far in advance can book
  minAdvanceBookingHours: number; // Minimum notice required
  // Meeting types
  meetingTypes: Array<{
    id: string;
    name: string;
    duration: number;
    description?: string;
    location?: string;
    isVirtual: boolean;
    videoLink?: string;
  }>;
  // Blocked dates (specific dates unavailable)
  blockedDates: Array<{
    date: string; // YYYY-MM-DD
    reason?: string;
  }>;
  // Status
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** Booking made by a client */
export interface BookingDoc {
  id: string;
  // Team member being booked
  teamMemberId: string;
  teamMemberName: string;
  teamMemberEmail: string;
  // Client info
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  clientCompany?: string;
  clientNotes?: string;
  // Meeting details
  meetingTypeId?: string;
  meetingTypeName: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  duration: number; // minutes
  timezone: string;
  // Location
  isVirtual: boolean;
  location?: string;
  videoLink?: string;
  // Status
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no-show';
  // Calendar integration
  calendarEventId?: string;
  // Email notifications
  confirmationEmailSent: boolean;
  reminderEmailSent: boolean;
  // Timestamps
  bookedAt: Timestamp;
  confirmedAt?: Timestamp;
  cancelledAt?: Timestamp;
  cancelReason?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============================================================================
// DocuSeal Integration Types
// ============================================================================

/** DocuSeal Template (cached locally) */
export interface DocuSealTemplateDoc {
  id: string;
  docusealId: number;
  name: string;
  slug: string;
  description?: string;
  category: 'nda' | 'engagement' | 'supplier_qualification' | 'msa' | 'sow' | 'other';
  fields: Array<{
    name: string;
    type: string;
    required?: boolean;
  }>;
  submitterRoles: string[];
  isActive: boolean;
  lastSyncedAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** DocuSeal Submission tracking */
export interface DocuSealSubmissionDoc {
  id: string;
  docusealSubmissionId: number;
  templateId: string;
  templateName: string;
  status: 'pending' | 'sent' | 'viewed' | 'completed' | 'declined' | 'expired';
  // Related entities
  organizationId?: string;
  organizationName?: string;
  opportunityId?: string;
  projectId?: string;
  // Submitters
  submitters: Array<{
    email: string;
    name: string;
    role: string;
    status: 'pending' | 'sent' | 'opened' | 'completed' | 'declined';
    completedAt?: Timestamp;
    signedDocumentUrl?: string;
  }>;
  // Document URLs
  combinedDocumentUrl?: string;
  auditLogUrl?: string;
  // Metadata
  sentAt?: Timestamp;
  completedAt?: Timestamp;
  expiresAt?: Timestamp;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============================================================================
// Software License Keys
// ============================================================================

export type ToolType =
  | 'apollo-search'
  | 'supplier-search'
  | 'ai-workforce'
  | 'proposal-creator'
  | 'docuseal'
  | 'gohighlevel'
  | 'linkedin-content'
  | 'bug-tracker'
  | 'traction'
  | 'networking'
  | 'calendar'
  | 'all-tools';

export interface SoftwareKeyDoc {
  id: string;
  // Key details
  key: string;                    // The actual license key (e.g., "ADAMS-XXXX-XXXX-XXXX")
  name: string;                   // Friendly name for the key
  description?: string;
  // Tool access
  tools: ToolType[];              // Which tools this key enables
  // Assignment
  assignedTo?: string;            // User ID or organization ID
  assignedToName?: string;        // Name of assignee
  assignedToEmail?: string;       // Email of assignee
  assignmentType?: 'user' | 'organization' | 'affiliate';
  // Validity
  status: 'active' | 'inactive' | 'expired' | 'revoked';
  activatedAt?: Timestamp;
  expiresAt?: Timestamp;
  // Usage limits
  maxActivations?: number;        // Max number of devices/sessions
  currentActivations: number;
  // Metadata
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  notes?: string;
}

export interface KeyActivationDoc {
  id: string;
  keyId: string;
  userId: string;
  userEmail: string;
  deviceInfo?: string;
  ipAddress?: string;
  activatedAt: Timestamp;
  lastUsedAt: Timestamp;
  isActive: boolean;
}

// ============================================================================
// White-Label Deployments
// ============================================================================

export type DeploymentStatus = 'pending' | 'provisioning' | 'active' | 'suspended' | 'terminated';
export type LicenseType = 'trial' | 'starter' | 'professional' | 'enterprise';
export type InfrastructureProvider = 'vercel' | 'netlify' | 'self-hosted';

export interface WhiteLabelDeploymentDoc {
  id: string;
  // Deployment Identity
  name: string;
  slug: string;
  status: DeploymentStatus;
  // Branding Configuration
  branding: {
    companyName: string;
    shortName: string;
    initials: string;
    tagline: string;
    primaryColor: string;
    secondaryColor: string;
    logoUrl?: string;
    faviconUrl?: string;
  };
  // Domain Configuration
  domains: {
    primary: string;
    portal?: string;
    api?: string;
    customDomains?: string[];
    sslEnabled: boolean;
  };
  // Infrastructure
  infrastructure: {
    provider: InfrastructureProvider;
    projectId?: string;
    deploymentUrl?: string;
    firebaseProjectId?: string;
    region?: string;
  };
  // License & Billing
  license: {
    type: LicenseType;
    startDate: Timestamp;
    endDate?: Timestamp;
    maxUsers?: number;
    maxAffiliates?: number;
    softwareKeys: string[];
  };
  // Feature Overrides
  features: {
    enabledTools: ToolType[];
    customFeatures?: Record<string, boolean>;
  };
  // Contact Information
  owner: {
    userId?: string;
    name: string;
    email: string;
    phone?: string;
    company: string;
  };
  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  provisionedAt?: Timestamp;
  lastActivityAt?: Timestamp;
  notes?: string;
}

/** Mattermost Playbook tracking document in Firestore */
export interface MattermostPlaybookDoc {
  id: string;
  mattermostPlaybookId: string; // ID from Mattermost
  title: string;
  description?: string;
  teamId: string;
  teamName?: string;
  type: "reminder" | "rock" | "level10" | "recurring" | "custom";
  recurrence?: "daily" | "weekly" | "biweekly" | "monthly";
  // Assigned team members (Adams Platform IDs)
  assignedMemberIds: string[];
  // Mattermost user IDs
  mattermostMemberIds: string[];
  // Checklist configuration
  checklists: {
    title: string;
    items: { title: string; description?: string }[];
  }[];
  // Status
  status: "active" | "archived" | "draft";
  // Notification settings
  notificationsEnabled: boolean;
  broadcastChannelId?: string;
  reminderIntervalSeconds?: number;
  // Metadata
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastDeployedAt?: Timestamp;
}

/** Mattermost Playbook Run tracking document in Firestore */
export interface MattermostPlaybookRunDoc {
  id: string;
  mattermostRunId: string; // ID from Mattermost
  playbookId: string; // Adams Platform playbook doc ID
  mattermostPlaybookId: string; // Mattermost playbook ID
  name: string;
  description?: string;
  teamId: string;
  channelId?: string; // Mattermost channel created for the run
  // Owner
  ownerUserId: string; // Mattermost user ID
  ownerMemberId?: string; // Adams Platform team member ID
  // Status tracking
  status: "in_progress" | "finished" | "archived";
  currentStatus?: string;
  // Checklist progress
  checklistProgress: {
    checklistIndex: number;
    title: string;
    totalItems: number;
    completedItems: number;
  }[];
  totalTasks: number;
  completedTasks: number;
  completionPercentage: number;
  // Assigned members
  assignedMemberIds: string[];
  mattermostMemberIds: string[];
  // Timestamps
  startedAt: Timestamp;
  endedAt?: Timestamp;
  lastStatusUpdate?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============================================================================
// Adams IQ Quiz
// ============================================================================

/** Quiz Question document in Firestore */
export interface QuizQuestionDoc {
  id: string;
  questionNumber: number;
  question: string;
  category: 'preconstruction' | 'risk' | 'fieldLeadership' | 'coordination' | 'closeout' | 'rework';
  isActive: boolean;
  order: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy?: string;
}

/** Quiz Answer option */
export interface QuizAnswerOption {
  value: number;
  label: string;
}

/** Quiz Submission document in Firestore */
export interface QuizSubmissionDoc {
  id: string;
  // Respondent info (optional - can be anonymous)
  respondentName?: string;
  respondentEmail?: string;
  respondentCompany?: string;
  respondentPhone?: string;
  // Answers - key is question ID, value is answer value (1-5)
  answers: Record<string, number>;
  // Calculated results
  totalScore: number;
  maxScore: number;
  percentage: number;
  scoreLevel: string; // "Critical" | "Vulnerable" | "Developing" | "Project-Ready"
  // Category scores
  categoryScores: {
    category: string;
    score: number;
    maxScore: number;
    percentage: number;
  }[];
  // Metadata
  completedAt: Timestamp;
  ipAddress?: string;
  userAgent?: string;
  referrer?: string;
  // Follow-up tracking
  followUpStatus?: 'pending' | 'contacted' | 'scheduled' | 'completed' | 'not_interested';
  followUpNotes?: string;
  assignedTo?: string;
  // Report delivery
  reportSentAt?: Timestamp;
  reportPdfUrl?: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

/** Quiz Report Template Configuration */
export interface QuizReportTemplateDoc {
  id: string;
  name: string;
  isActive: boolean;
  // Executive Summary Section
  executiveSummary: {
    enabled: boolean;
    title: string;
    showOverallScore: boolean;
    showKeyStrengths: boolean;
    showDevelopmentAreas: boolean;
    customIntroText?: string;
  };
  // Detailed Analysis Sections
  detailedSections: {
    id: string;
    title: string;
    enabled: boolean;
    order: number;
    category: string; // maps to quiz category
    description: string;
    scoringCriteria: {
      low: { min: number; max: number; label: string; description: string };
      medium: { min: number; max: number; label: string; description: string };
      high: { min: number; max: number; label: string; description: string };
    };
  }[];
  // Recommendations Section
  recommendations: {
    enabled: boolean;
    title: string;
    showPrioritizedInitiatives: boolean;
    showImplementationGuidance: boolean;
    showExpectedOutcomes: boolean;
    // Custom recommendations per score level
    byScoreLevel: {
      critical: string[];
      vulnerable: string[];
      developing: string[];
      projectready: string[];
    };
  };
  // Call to Action
  callToAction: {
    enabled: boolean;
    title: string;
    description: string;
    buttonText: string;
    buttonUrl: string;
  };
  // Branding
  branding: {
    logoUrl?: string;
    primaryColor: string;
    secondaryColor: string;
    companyName: string;
    contactEmail: string;
    contactPhone: string;
    website: string;
  };
  // Email Settings
  emailSettings: {
    subject: string;
    fromName: string;
    replyTo: string;
    introText: string;
    signatureText: string;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy?: string;
}

// ============================================================================
// Hero Slide Types
// ============================================================================

/** Hero slide document in Firestore */
export interface HeroSlideDoc {
  id: string;
  badge: string;
  headline: string;
  highlightedText: string;
  subheadline: string;
  benefits: string[];
  primaryCta: {
    text: string;
    href: string;
  };
  secondaryCta: {
    text: string;
    href: string;
  };
  isPublished: boolean;
  order: number;
  backgroundImage?: {
    imageId: string; // Reference to Image Manager image
    url: string; // Cached data URL for display
    name: string; // Image name from Image Manager
  };
  animation?: {
    type: "fade" | "slide-up" | "slide-left" | "zoom" | "none";
    duration: number;
    delay: number;
  };
  overlay?: {
    enabled: boolean;
    color: string;
    opacity: number;
  };
  leadMagnet?: {
    enabled: boolean;
    type: "quiz" | "download" | "consultation" | "demo";
    urgency?: string;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy?: string;
  updatedBy?: string;
}

/** Success Story / Testimonial document in Firestore */
export interface SuccessStoryDoc {
  id: string;
  name: string; // Client name (e.g., "Alex Richardson")
  company: string; // Company name
  industry: string; // Industry type
  location: string; // Location (e.g., "Cincinnati, OH")
  quote: string; // Main testimonial quote
  challenge: string; // The challenge they faced
  solution?: string; // How Adams Electric helped (for featured stories)
  results: Array<{
    metric: string;
    value: string;
    period?: string; // Optional time period context
  }>;
  image?: {
    imageId: string;
    url: string;
    name: string;
  };
  isFeatured: boolean; // Featured stories get special layout
  isPublished: boolean;
  order: number; // For sorting display order
  rating: number; // 1-5 star rating
  tags?: string[]; // For filtering (e.g., ["healthcare", "preconstruction", "design-build"])
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy?: string;
  updatedBy?: string;
}

// ============================================================================
// Backup System Types
// ============================================================================

/** Backup metadata document in Firestore */
export interface BackupMetadataDoc {
  id: string;
  createdAt: Timestamp;
  completedAt?: Timestamp;
  type: "full" | "incremental" | "collections";
  status: "pending" | "in_progress" | "success" | "failed" | "partial";
  size: number;
  compressedSize: number;
  duration: number;
  collections: string[];
  documentCounts: Record<string, number>;
  storageLocations: {
    provider: string;
    path: string;
    url?: string;
  }[];
  checksum: string;
  encryptionEnabled: boolean;
  triggeredBy: "manual" | "scheduled";
  scheduleId?: string;
  error?: string;
  metadata: Record<string, any>;
}

/** Backup schedule document in Firestore */
export interface BackupScheduleDoc {
  id: string;
  name: string;
  description?: string;
  cronExpression: string;
  timezone: string;
  enabled: boolean;
  backupType: "full" | "incremental" | "collections";
  collections?: string[];
  storageProviders: string[];
  compression: "gzip" | "zip" | "none";
  encryption: boolean;
  retentionPolicy: {
    keepLast: number;
    keepDailyFor: number;
    keepWeeklyFor: number;
    keepMonthlyFor: number;
  };
  notifications: {
    onSuccess: boolean;
    onFailure: boolean;
    emails: string[];
  };
  lastRunAt?: Timestamp;
  nextRunAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}

/** Storage provider configuration document in Firestore */
export interface BackupStorageProviderDoc {
  id: string;
  name: string;
  type: "local" | "s3" | "gcs" | "azure" | "firebase";
  enabled: boolean;
  isDefault: boolean;
  config: {
    bucket?: string;
    region?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    endpoint?: string;
    projectId?: string;
    keyFile?: string;
    connectionString?: string;
    containerName?: string;
    basePath?: string;
    storageBucket?: string;
  };
  pathPrefix: string;
  usedStorage?: number;
  maxStorage?: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============================================================================
// Collection Names
// ============================================================================

export const COLLECTIONS = {
  USERS: "users",
  ORGANIZATIONS: "organizations",
  OPPORTUNITIES: "opportunities",
  PROJECTS: "projects",
  MEETINGS: "meetings",
  ACTION_ITEMS: "actionItems",
  ROCKS: "rocks",
  DOCUMENTS: "documents",
  PLATFORM_DOCUMENTS: "platformDocuments",
  DOCUMENT_VERSIONS: "documentVersions",
  DOCUMENT_AI_EDITS: "documentAiEdits",
  SERVICES: "services",
  CERTIFICATIONS: "certifications",
  ACTIVITIES: "activities",
  NOTES: "notes",
  MILESTONES: "milestones",
  ROCK_MILESTONES: "rockMilestones",
  CAPABILITIES: "capabilities",
  // Affiliate Networking Collections
  AFFILIATE_BIOGRAPHIES: "affiliateBiographies",
  GAINS_PROFILES: "gainsProfiles",
  CONTACT_SPHERES: "contactSpheres",
  PREVIOUS_CUSTOMERS: "previousCustomers",
  ONE_TO_ONE_MEETINGS: "oneToOneMeetings",
  REFERRALS: "referrals",
  AFFILIATE_STATS: "affiliateStats",
  AI_MATCH_SUGGESTIONS: "aiMatchSuggestions",
  // Strategic Partners
  STRATEGIC_PARTNERS: "strategicPartners",
  // Team Members
  TEAM_MEMBERS: "teamMembers",
  // Platform Settings
  PLATFORM_SETTINGS: "platformSettings",
  // Apollo Purchased Contacts
  APOLLO_PURCHASED_CONTACTS: "apolloPurchasedContacts",
  // Apollo Saved Lists
  APOLLO_SAVED_LISTS: "apolloSavedLists",
  // ThomasNet Saved Suppliers
  THOMASNET_SAVED_SUPPLIERS: "thomasnetSavedSuppliers",
  // ThomasNet Saved Lists
  THOMASNET_SAVED_LISTS: "thomasnetSavedLists",
  // Traction/EOS Collections
  TRACTION_ROCKS: "tractionRocks",
  TRACTION_SCORECARD_METRICS: "tractionScorecardMetrics",
  TRACTION_ISSUES: "tractionIssues",
  TRACTION_TODOS: "tractionTodos",
  TRACTION_MEETINGS: "tractionMeetings",
  TRACTION_TEAM_MEMBERS: "tractionTeamMembers",
  // GoHighLevel Integration Collections
  GHL_INTEGRATIONS: "gohighlevelIntegrations",
  GHL_SYNC_LOGS: "gohighlevelSyncLogs",
  GHL_WORKFLOWS: "ghlWorkflows",
  GHL_IMPORTED_WORKFLOWS: "ghlImportedWorkflows",
  // Calendar Events (built-in calendar)
  CALENDAR_EVENTS: "calendarEvents",
  // Site Calendars (safety office / job site TV displays)
  SITECALENDARS: "siteCalendars",
  SITECALENDARITEMS: "siteCalendarItems",
  // 1-to-1 Scheduling Queue
  ONE_TO_ONE_QUEUE: "oneToOneQueue",
  // Team Member Availability & Bookings
  TEAM_MEMBER_AVAILABILITY: "teamMemberAvailability",
  BOOKINGS: "bookings",
  // DocuSeal Integration Collections
  DOCUSEAL_TEMPLATES: "docusealTemplates",
  DOCUSEAL_SUBMISSIONS: "docusealSubmissions",
  // Software License Keys
  SOFTWARE_KEYS: "softwareKeys",
  KEY_ACTIVATIONS: "keyActivations",
  // Mail / Chat Channel Integration
  USER_MICROSOFT_TOKENS: "userMicrosoftTokens",
  USER_CHAT_CHANNELS: "userChatChannels",
  // White-Label Deployments
  WHITE_LABEL_DEPLOYMENTS: "whiteLabelDeployments",
  DEPLOYMENT_ANALYTICS: "deploymentAnalytics",
  DEPLOYMENT_AUDIT_LOGS: "deploymentAuditLogs",
  // Mattermost Playbooks
  MATTERMOST_PLAYBOOKS: "mattermostPlaybooks",
  MATTERMOST_PLAYBOOK_RUNS: "mattermostPlaybookRuns",
  // Events
  EVENTS: "events",
  EVENT_REGISTRATIONS: "eventRegistrations",
  // Adams IQ Quiz
  QUIZ_QUESTIONS: "quizQuestions",
  QUIZ_SUBMISSIONS: "quizSubmissions",
  QUIZ_REPORT_TEMPLATES: "quizReportTemplates",
  // AI Workforce
  AI_EMPLOYEES: "aiEmployees",
  AI_EMPLOYEE_CHATS: "aiEmployeeChats",
  // Platform Development Tracking
  PLATFORM_DEV_TASKS: "platformDevTasks",
  PLATFORM_DEV_REPORTS: "platformDevReports",
  // Bug Tracker
  BUG_TRACKER_ITEMS: "bugTrackerItems",
  // Backup System
  BACKUP_METADATA: "backupMetadata",
  BACKUP_SCHEDULES: "backupSchedules",
  BACKUP_STORAGE_PROVIDERS: "backupStorageProviders",
  // Hero Slides
  HERO_SLIDES: "heroSlides",
  // Success Stories (Testimonials)
  SUCCESS_STORIES: "successStories",
  DEPARTMENTS: "departments",
  PROCESS_INTERVIEWS: "processInterviews",
  SOLUTION_SPECIFICATIONS: "solutionSpecifications",
  ADAMS_AUDIT_LOGS: "adamsAuditLogs",
  MODULE_BUILDS: "moduleBuilds",
  MODULE_RECORDS: "moduleRecords",
  MODULE_SCHEDULE_RUNS: "moduleScheduleRuns",
  MODULE_NOTIFICATIONS: "moduleNotifications",
  MODULE_UPLOADS: "moduleUploads",
  MODULE_SETTINGS: "moduleSettings",
  ADAMS_BRAINS: "adamsBrains",
  BRAIN_SOURCES: "brainSources",
  BRAIN_CHUNKS: "brainChunks",
  BRAIN_QUERIES: "brainQueries",
} as const;

// ============================================================================
// Collection References
// ============================================================================

/** Get typed collection reference */
export const getCollection = <T>(collectionName: string): CollectionReference<T> | null => {
  if (!db) return null;
  return collection(db, collectionName) as CollectionReference<T>;
};

/** Get typed document reference */
export const getDocRef = <T>(collectionName: string, docId: string): DocumentReference<T> | null => {
  if (!db) return null;
  return doc(db, collectionName, docId) as DocumentReference<T>;
};

// Pre-typed collection references
export const usersCollection = () => getCollection<UserDoc>(COLLECTIONS.USERS);
export const organizationsCollection = () => getCollection<OrganizationDoc>(COLLECTIONS.ORGANIZATIONS);
export const opportunitiesCollection = () => getCollection<OpportunityDoc>(COLLECTIONS.OPPORTUNITIES);
export const projectsCollection = () => getCollection<ProjectDoc>(COLLECTIONS.PROJECTS);
export const meetingsCollection = () => getCollection<MeetingDoc>(COLLECTIONS.MEETINGS);
export const actionItemsCollection = () => getCollection<ActionItemDoc>(COLLECTIONS.ACTION_ITEMS);
export const rocksCollection = () => getCollection<RockDoc>(COLLECTIONS.ROCKS);
export const documentsCollection = () => getCollection<DocumentDoc>(COLLECTIONS.DOCUMENTS);
export const servicesCollection = () => getCollection<ServiceDoc>(COLLECTIONS.SERVICES);
export const activitiesCollection = () => getCollection<ActivityDoc>(COLLECTIONS.ACTIVITIES);
export const notesCollection = () => getCollection<NoteDoc>(COLLECTIONS.NOTES);

// Affiliate Networking collection references
export const affiliateBiographiesCollection = () => getCollection<AffiliateBiographyDoc>(COLLECTIONS.AFFILIATE_BIOGRAPHIES);
export const gainsProfilesCollection = () => getCollection<GainsProfileDoc>(COLLECTIONS.GAINS_PROFILES);
export const contactSpheresCollection = () => getCollection<ContactSphereDoc>(COLLECTIONS.CONTACT_SPHERES);
export const previousCustomersCollection = () => getCollection<PreviousCustomersDoc>(COLLECTIONS.PREVIOUS_CUSTOMERS);
export const oneToOneMeetingsCollection = () => getCollection<OneToOneMeetingDoc>(COLLECTIONS.ONE_TO_ONE_MEETINGS);
export const referralsCollection = () => getCollection<ReferralDoc>(COLLECTIONS.REFERRALS);
export const affiliateStatsCollection = () => getCollection<AffiliateStatsDoc>(COLLECTIONS.AFFILIATE_STATS);
export const aiMatchSuggestionsCollection = () => getCollection<AiMatchSuggestionDoc>(COLLECTIONS.AI_MATCH_SUGGESTIONS);

// Strategic Partners collection reference
export const strategicPartnersCollection = () => getCollection<StrategicPartnerDoc>(COLLECTIONS.STRATEGIC_PARTNERS);

// Team Members collection reference
export const teamMembersCollection = () => getCollection<TeamMemberDoc>(COLLECTIONS.TEAM_MEMBERS);

// Platform Settings collection reference
export const platformSettingsCollection = () => getCollection<PlatformSettingsDoc>(COLLECTIONS.PLATFORM_SETTINGS);

// Traction/EOS collection references
export const tractionRocksCollection = () => getCollection<TractionRockDoc>(COLLECTIONS.TRACTION_ROCKS);
export const tractionScorecardMetricsCollection = () => getCollection<TractionScorecardMetricDoc>(COLLECTIONS.TRACTION_SCORECARD_METRICS);
export const tractionIssuesCollection = () => getCollection<TractionIssueDoc>(COLLECTIONS.TRACTION_ISSUES);
export const tractionTodosCollection = () => getCollection<TractionTodoDoc>(COLLECTIONS.TRACTION_TODOS);
export const tractionMeetingsCollection = () => getCollection<TractionMeetingDoc>(COLLECTIONS.TRACTION_MEETINGS);
export const tractionTeamMembersCollection = () => getCollection<TractionTeamMemberDoc>(COLLECTIONS.TRACTION_TEAM_MEMBERS);

// Bug Tracker collection reference
export const bugTrackerItemsCollection = () => getCollection<BugTrackerItemDoc>(COLLECTIONS.BUG_TRACKER_ITEMS);

// Success Stories collection reference
export const successStoriesCollection = () => getCollection<SuccessStoryDoc>(COLLECTIONS.SUCCESS_STORIES);

// Platform Development Tracking collection references
export const platformDevTasksCollection = () => getCollection<PlatformDevTaskDoc>(COLLECTIONS.PLATFORM_DEV_TASKS);
export const platformDevReportsCollection = () => getCollection<PlatformDevReportDoc>(COLLECTIONS.PLATFORM_DEV_REPORTS);

// Site Calendars collection references
export const siteCalendarsCollection = () => getCollection<SiteCalendarDoc>(COLLECTIONS.SITECALENDARS);
export const siteCalendarItemsCollection = () => getCollection<SiteCalendarItemDoc>(COLLECTIONS.SITECALENDARITEMS);

// Mail / Chat channel collection references
export const userMicrosoftTokensCollection = () => getCollection<UserMicrosoftTokenDoc>(COLLECTIONS.USER_MICROSOFT_TOKENS);
export const userChatChannelsCollection = () => getCollection<UserChatChannelDoc>(COLLECTIONS.USER_CHAT_CHANNELS);

// ============================================================================
// Subcollection Helpers
// ============================================================================

/** Get milestones subcollection for a project */
export const projectMilestonesCollection = (projectId: string): CollectionReference<MilestoneDoc> | null => {
  if (!db) return null;
  return collection(db, COLLECTIONS.PROJECTS, projectId, "milestones") as CollectionReference<MilestoneDoc>;
};

/** Get action items subcollection for a meeting */
export const meetingActionItemsCollection = (meetingId: string): CollectionReference<ActionItemDoc> | null => {
  if (!db) return null;
  return collection(db, COLLECTIONS.MEETINGS, meetingId, "actionItems") as CollectionReference<ActionItemDoc>;
};

/** Get milestones subcollection for a rock */
export const rockMilestonesCollection = (rockId: string): CollectionReference<RockMilestoneDoc> | null => {
  if (!db) return null;
  return collection(db, COLLECTIONS.ROCKS, rockId, "milestones") as CollectionReference<RockMilestoneDoc>;
};

/** Get certifications subcollection for an organization */
export const organizationCertificationsCollection = (orgId: string): CollectionReference<CertificationDoc> | null => {
  if (!db) return null;
  return collection(db, COLLECTIONS.ORGANIZATIONS, orgId, "certifications") as CollectionReference<CertificationDoc>;
};

/** Get capabilities subcollection for an organization */
export const organizationCapabilitiesCollection = (orgId: string): CollectionReference<Capability> | null => {
  if (!db) return null;
  return collection(db, COLLECTIONS.ORGANIZATIONS, orgId, "capabilities") as CollectionReference<Capability>;
};

// ============================================================================
// Utility Functions
// ============================================================================

/** Convert Date to Firestore Timestamp */
export const toTimestamp = (date: Date): Timestamp => {
  return Timestamp.fromDate(date);
};

/** Convert Firestore Timestamp to Date */
export const fromTimestamp = (timestamp: Timestamp): Date => {
  return timestamp.toDate();
};

/** Generate a new document ID */
export const generateId = (collectionName: string): string | null => {
  if (!db) return null;
  return doc(collection(db, collectionName)).id;
};

// ============================================================================
// Database Schema Documentation
// ============================================================================

/**
 * FIRESTORE DATABASE STRUCTURE
 * ============================
 *
 * /users/{userId}
 *   - UserDoc
 *
 * /organizations/{orgId}
 *   - OrganizationDoc
 *   /certifications/{certId} - CertificationDoc
 *   /capabilities/{capId} - Capability
 *
 * /opportunities/{oppId}
 *   - OpportunityDoc
 *
 * /projects/{projectId}
 *   - ProjectDoc
 *   /milestones/{milestoneId} - MilestoneDoc
 *
 * /meetings/{meetingId}
 *   - MeetingDoc
 *   /actionItems/{actionId} - ActionItemDoc
 *
 * /rocks/{rockId}
 *   - RockDoc
 *   /milestones/{milestoneId} - RockMilestoneDoc
 *
 * /documents/{docId}
 *   - DocumentDoc
 *
 * /services/{serviceId}
 *   - ServiceDoc
 *
 * /activities/{activityId}
 *   - ActivityDoc (polymorphic, linked to various entities)
 *
 * /notes/{noteId}
 *   - NoteDoc (polymorphic, linked to various entities)
 *
 * /actionItems/{actionId}
 *   - ActionItemDoc (top-level for cross-entity queries)
 *
 *
 * AFFILIATE NETWORKING SYSTEM
 * ===========================
 * /affiliateBiographies/{bioId}
 *   - AffiliateBiographyDoc (Member Bio Sheet)
 *
 * /gainsProfiles/{profileId}
 *   - GainsProfileDoc (Goals, Accomplishments, Interests, Networks, Skills)
 *
 * /contactSpheres/{sphereId}
 *   - ContactSphereDoc (Contact Sphere Planning)
 *
 * /previousCustomers/{customersId}
 *   - PreviousCustomersDoc (Previous 10 Customers)
 *
 * /oneToOneMeetings/{meetingId}
 *   - OneToOneMeetingDoc (Scheduled one-to-one meetings between affiliates)
 *
 * /referrals/{referralId}
 *   - ReferralDoc (Referrals given/received, including Adams referrals)
 *
 * /affiliateStats/{statsId}
 *   - AffiliateStatsDoc (Aggregated metrics per affiliate)
 *
 * /aiMatchSuggestions/{suggestionId}
 *   - AiMatchSuggestionDoc (AI-generated partner suggestions)
 *
 *
 * SECURITY RULES CONSIDERATIONS
 * =============================
 * - Users can only read/write their own user document
 * - Organization members can read organization data
 * - Admins have full access to all collections
 * - Affiliates can only access assigned opportunities/projects
 * - Documents inherit permissions from parent entity
 *
 *
 * INDEXES REQUIRED
 * ================
 * - opportunities: organizationId + stage (composite)
 * - opportunities: ownerId + expectedCloseDate (composite)
 * - projects: organizationId + status (composite)
 * - activities: entityType + entityId + createdAt (composite)
 * - actionItems: assigneeId + status + dueDate (composite)
 * - rocks: ownerId + quarter (composite)
 */
