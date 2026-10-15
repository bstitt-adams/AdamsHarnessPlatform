// Core Types for Adams Electric Platform

// User roles
export type UserRole = 'admin' | 'team' | 'affiliate' | 'customer' | 'partner';

// Organization types
export type OrganizationType = 'customer' | 'affiliate' | 'partner' | 'oem' | 'internal';

// Opportunity stages
export type OpportunityStage = 'lead' | 'discovery' | 'proposal' | 'negotiation' | 'closed-won' | 'closed-lost';

// Project status
export type ProjectStatus = 'planning' | 'active' | 'on-hold' | 'completed' | 'cancelled';

// Capability categories
export type CapabilityCategory = 'lean' | 'quality' | 'automation' | 'digital' | 'workforce' | 'supply-chain' | 'other';

// Priority levels
export type Priority = 'low' | 'medium' | 'high' | 'urgent';

// Task status
export type TaskStatus = 'pending' | 'in-progress' | 'completed' | 'cancelled';

// Rock status
export type RockStatus = 'on-track' | 'at-risk' | 'off-track' | 'completed';

// Address interface
export interface Address {
  street?: string;
  city: string;
  state: string;
  zip?: string;
  country: string;
}

// User interface
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  organizationId?: string;
  capabilities?: Capability[];
  createdAt: Date;
  lastActive: Date;
}

// Organization interface
export interface Organization {
  id: string;
  name: string;
  type: OrganizationType;
  industry?: string;
  size?: '1-25' | '25-100' | '100-250' | '250-500' | '500+';
  location?: Address;
  website?: string;
  contacts?: User[];
  capabilities?: Capability[];
  certifications?: Certification[];
  createdAt: Date;
}

// Capability interface
export interface Capability {
  id: string;
  name: string;
  category: CapabilityCategory;
  level: 'basic' | 'intermediate' | 'expert';
  certifications?: string[];
  yearsExperience: number;
}

// Certification interface
export interface Certification {
  id: string;
  name: string;
  issuingBody: string;
  dateObtained: Date;
  expirationDate?: Date;
  status: 'active' | 'expired' | 'pending';
}

// Service interface
export interface Service {
  id: string;
  name: string;
  category: 'preconstruction' | 'construction' | 'adams-platform';
  description: string;
  features: string[];
  pricing?: {
    type: 'fixed' | 'hourly' | 'project' | 'subscription';
    amount?: number;
    currency?: string;
  };
}

// Opportunity interface
export interface Opportunity {
  id: string;
  name: string;
  organizationId: string;
  organization?: Organization;
  stage: OpportunityStage;
  value: number;
  probability: number;
  expectedCloseDate: Date;
  owner: User;
  assignedAffiliates?: User[];
  services: Service[];
  notes: Note[];
  activities: Activity[];
  createdAt: Date;
  updatedAt: Date;
}

// Project interface
export interface Project {
  id: string;
  name: string;
  opportunityId?: string;
  organizationId: string;
  organization?: Organization;
  status: ProjectStatus;
  startDate: Date;
  endDate?: Date;
  team: User[];
  milestones: Milestone[];
  documents: Document[];
  meetings: Meeting[];
  createdAt: Date;
}

// Milestone interface
export interface Milestone {
  id: string;
  title: string;
  description?: string;
  dueDate: Date;
  completedDate?: Date;
  status: 'pending' | 'in-progress' | 'completed' | 'overdue';
  projectId: string;
}

// Document interface
export interface Document {
  id: string;
  name: string;
  type: string;
  url: string;
  size: number;
  uploadedBy: User;
  projectId?: string;
  organizationId?: string;
  createdAt: Date;
}

// Meeting interface
export interface Meeting {
  id: string;
  title: string;
  date: Date;
  duration: number;
  attendees: User[];
  projectId?: string;
  opportunityId?: string;
  transcript?: string;
  summary?: string;
  actionItems: ActionItem[];
  keyDecisions: string[];
  firefliesId?: string;
  recordingUrl?: string;
}

// Action Item interface
export interface ActionItem {
  id: string;
  title: string;
  description?: string;
  assignee: User;
  dueDate?: Date;
  status: TaskStatus;
  priority: Priority;
  source: 'manual' | 'meeting' | 'ai-extracted';
  meetingId?: string;
  projectId?: string;
  createdAt: Date;
}

// Note interface
export interface Note {
  id: string;
  content: string;
  author: User;
  createdAt: Date;
  updatedAt?: Date;
}

// Activity interface
export interface Activity {
  id: string;
  type: 'call' | 'email' | 'meeting' | 'note' | 'stage-change' | 'document' | 'task';
  description: string;
  user: User;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

// Rock (90-day goal) interface
export interface Rock {
  id: string;
  title: string;
  description: string;
  owner: User;
  quarter: string;
  status: RockStatus;
  progress: number;
  milestones: RockMilestone[];
  createdAt: Date;
}

// Rock Milestone interface
export interface RockMilestone {
  id: string;
  title: string;
  completed: boolean;
  completedDate?: Date;
}

// Dashboard Stats interface
export interface DashboardStats {
  pipelineValue: number;
  pipelineChange: number;
  activeProjects: number;
  projectsAtRisk: number;
  rockProgress: number;
  daysRemaining: number;
  teamOnline: number;
}

// Navigation item interface
export interface NavItem {
  title: string;
  href: string;
  icon?: string;
  badge?: string | number;
  children?: NavItem[];
}
