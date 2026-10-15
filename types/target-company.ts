/**
 * Target Company Types for Adams Electric
 * 
 * These types define the structure for prospect/target company management
 */

export type OutreachStatus = 
  | 'not_started'
  | 'researching'
  | 'initial_contact'
  | 'follow_up'
  | 'meeting_scheduled'
  | 'meeting_completed'
  | 'proposal_sent'
  | 'negotiating'
  | 'won'
  | 'lost'
  | 'nurturing'
  | 'not_interested'
  | 'bad_timing';

export type GrowthNeedLevel = 'high' | 'medium' | 'low' | 'unknown';

export type ActivityType =
  | 'email_sent'
  | 'email_received'
  | 'phone_call'
  | 'voicemail'
  | 'linkedin_message'
  | 'linkedin_connection'
  | 'meeting'
  | 'strategy_call'
  | 'proposal_sent'
  | 'contract_sent'
  | 'note'
  | 'status_change'
  | 'quiz_completed'
  | 'website_visit'
  | 'content_download'
  | 'event_attended'
  | 'referral_received'
  | 'other';

export type CompanyTier = 1 | 2 | 3;

export interface TargetCompany {
  id: string;
  
  // Company Information
  companyName: string;
  industry: string;
  subIndustry?: string;
  
  // Location
  city: string;
  state: string;
  zipCode?: string;
  address?: string;
  
  // Company Size
  employeeCount?: number;
  employeeRange?: string;
  estimatedRevenue?: number;
  revenueRange?: string;
  
  // Primary Contact
  primaryContactName?: string;
  primaryContactTitle?: string;
  primaryContactEmail?: string;
  primaryContactPhone?: string;
  primaryContactLinkedin?: string;
  
  // Secondary Contact
  secondaryContactName?: string;
  secondaryContactTitle?: string;
  secondaryContactEmail?: string;
  secondaryContactPhone?: string;
  
  // Decision Maker
  decisionMakerName?: string;
  decisionMakerTitle?: string;
  decisionMakerEmail?: string;
  decisionMakerPhone?: string;
  
  // Company Details
  website?: string;
  linkedinUrl?: string;
  yearFounded?: number;
  companyDescription?: string;
  
  // Pain Points & Needs
  painPoints: string[];
  triggerEvents: string[];
  serviceInterests: string[];
  
  // Prioritization
  tier: CompanyTier;
  priorityScore: number;
  idealCustomerFit: boolean;
  
  // Owner/Founder Details
  ownerName?: string;
  ownerAgeRange?: string;
  growthNeedLevel: GrowthNeedLevel;
  projectTimelineYears?: number;
  
  // Outreach Status
  outreachStatus: OutreachStatus;
  
  // Outreach Tracking
  firstContactDate?: Date;
  lastContactDate?: Date;
  nextFollowUpDate?: Date;
  contactAttempts: number;
  
  // Engagement
  quizCompleted: boolean;
  quizCompletedDate?: Date;
  quizScore?: number;
  
  strategyCallScheduled: boolean;
  strategyCallDate?: Date;
  strategyCallNotes?: string;
  
  // Deal Information
  dealValue?: number;
  dealClosedDate?: Date;
  lostReason?: string;
  
  // Source & Attribution
  leadSource?: string;
  referralSource?: string;
  campaignSource?: string;
  
  // Notes & Activity
  notes?: string;
  internalNotes?: string;
  tags: string[];
  
  // Assignment
  assignedTo?: string;
  assignedToName?: string;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  lastModifiedBy?: string;
}

export interface TargetCompanyActivity {
  id: string;
  targetCompanyId: string;
  
  // Activity Details
  activityType: ActivityType;
  subject?: string;
  description?: string;
  outcome?: string;
  
  // Contact involved
  contactName?: string;
  contactEmail?: string;
  
  // Follow-up
  followUpRequired: boolean;
  followUpDate?: Date;
  followUpCompleted: boolean;
  
  // Metadata
  performedBy?: string;
  performedByName?: string;
  createdAt: Date;
}

export interface TargetCompanyFilters {
  tier?: CompanyTier[];
  industry?: string[];
  state?: string[];
  city?: string[];
  outreachStatus?: OutreachStatus[];
  growthNeedLevel?: GrowthNeedLevel[];
  assignedTo?: string;
  hasFollowUpDue?: boolean;
  quizCompleted?: boolean;
  strategyCallScheduled?: boolean;
  tags?: string[];
  searchQuery?: string;
}

export interface TargetCompanySummary {
  tier: CompanyTier;
  outreachStatus: OutreachStatus;
  industry: string;
  state: string;
  companyCount: number;
  quizCompletedCount: number;
  callsScheduledCount: number;
  totalDealValue: number;
}

export interface TargetCompanyPipeline {
  outreachStatus: OutreachStatus;
  count: number;
  totalValue: number;
  avgPriority: number;
}

// Helper function to get tier label
export function getTierLabel(tier: CompanyTier): string {
  switch (tier) {
    case 1:
      return 'Tier 1 - Immediate Outreach';
    case 2:
      return 'Tier 2 - Follow-up';
    case 3:
      return 'Tier 3 - Nurture';
    default:
      return 'Unknown';
  }
}

// Helper function to get status label
export function getOutreachStatusLabel(status: OutreachStatus): string {
  const labels: Record<OutreachStatus, string> = {
    not_started: 'Not Started',
    researching: 'Researching',
    initial_contact: 'Initial Contact',
    follow_up: 'Follow Up',
    meeting_scheduled: 'Meeting Scheduled',
    meeting_completed: 'Meeting Completed',
    proposal_sent: 'Proposal Sent',
    negotiating: 'Negotiating',
    won: 'Won',
    lost: 'Lost',
    nurturing: 'Nurturing',
    not_interested: 'Not Interested',
    bad_timing: 'Bad Timing',
  };
  return labels[status] || status;
}

// Helper function to get status color
export function getOutreachStatusColor(status: OutreachStatus): string {
  const colors: Record<OutreachStatus, string> = {
    not_started: 'gray',
    researching: 'blue',
    initial_contact: 'cyan',
    follow_up: 'yellow',
    meeting_scheduled: 'orange',
    meeting_completed: 'purple',
    proposal_sent: 'pink',
    negotiating: 'indigo',
    won: 'green',
    lost: 'red',
    nurturing: 'teal',
    not_interested: 'slate',
    bad_timing: 'blue',
  };
  return colors[status] || 'gray';
}
